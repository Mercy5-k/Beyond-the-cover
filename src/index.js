// Grab references to important DOM elements for interaction//
const searchInput = document.getElementById('searchInput');
const genreFilter = document.getElementById('genreFilter');
const booksContainer = document.getElementById('booksContainer');
const trendingBooksContainer = document.getElementById('trendingBooksContainer');
const readingListItems = document.getElementById('readingListItems')
const readingListMessage = document.getElementById('readingListMessage');
const toggleThemeBtn = document.getElementById('toggleThemeBtn');
const signupBtn = document.getElementById('signupBtn');
const signinBtn = document.getElementById('signinBtn');
const authMessage = document.getElementById('authMessage');
const signInLink = document.getElementById('signInLink');
const signUpLink = document.getElementById('signUpLink');
const signInForm = document.getElementById('signInForm');
const signUpForm = document.getElementById('signUpForm');

const JSON_SERVER_URL = 'http://localhost:3000';// Backend REST API URL

const taglines = [
  "📚 Explore, Reflect, and Reimagine Books",
  "📖 Where Every Page Matters",
  "🧠 Feed Your Mind. Free Your Thoughts.",
  "📘 Your Personal Literary Retreat",
  "💡 One Book Can Change Everything"
];

let currentTag = 0;
setInterval(() => {
  const taglineEl = document.getElementById("tagline");
  currentTag = (currentTag + 1) % taglines.length;
  taglineEl.textContent = taglines[currentTag];
}, 4000);

let currentUser = null; // Keep track of signed-in user

fetch('http://127.0.0.1:3000/users')
  .then(res => res.json())
  .then(users => {
    if (users.length > 0) {
      currentUser = users[0];
      localStorage.setItem('currentUser', JSON.stringify(currentUser));

      const authMessage = document.getElementById('authMessage');
      authMessage.textContent = `Signed in as ${currentUser.username}`;
      document.getElementById('authContainer').style.display = 'none';
    } else {
      // handle no users
    }
  })
  .catch(console.error);

// Show sign-in form and hide sign-up form when "Sign In" link is clicked
signInForm.classList.toggle('hidden');
signUpForm.classList.add('hidden');
authMessage.textContent = '';

// Show sign-up form and hide sign-in form when "Sign Up" link is clicked
  signInLink.addEventListener('click', () => {
  signInForm.classList.toggle('hidden');
  signUpForm.classList.add('hidden');
  authMessage.textContent = '';
});


// Handle sign-up form submission
signupBtn.addEventListener('click', async () => {
  console.log('Sign-up clicked');

  const username = document.getElementById('signupUsername').value.trim();
  const password = document.getElementById('signupPassword').value;
  console.log('Attempting signup with:', username, password);

  if (!username || !password) {
    authMessage.textContent = 'Please enter both username and password.';
    return;
  }

  try {
    const existing = await fetch(`${JSON_SERVER_URL}/users?username=${username}`)
      .then(res => res.json());

    console.log('Existing users:', existing);

    if (existing.length > 0) {
      authMessage.textContent = 'Username already exists.';
      return;
    }

    const res = await fetch(`${JSON_SERVER_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) throw new Error(`Signup failed with status: ${res.status}`);

    authMessage.textContent = 'Sign-up successful. You can now sign in.';
    signUpForm.classList.add('hidden');
  } catch (error) {
    console.error('Sign-up error:', error);
    authMessage.textContent = 'Error signing up. Please try again.';
  }
});

signinBtn.addEventListener('click', async () => {
  const username = document.getElementById('signinUsername').value.trim();
  const password = document.getElementById('signinPassword').value;
  
  if (!username || !password) {
    authMessage.textContent = 'Please enter both username and password.';
    return;
  }

  try {
    console.log('Signing in with:', username, password);

    const res = await fetch(`${JSON_SERVER_URL}/users?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`);
    const users = await res.json(); // ✅ users is defined here

    if (users.length > 5) {
      currentUser = users[5];
      localStorage.setItem('currentUser', JSON.stringify(currentUser)); // Save for session
      authMessage.textContent = `Signed in as ${currentUser.username}`;
      document.getElementById('authContainer').style.display = 'none';
      
      if (currentUser) {
        signoutBtn.style.display = 'inline-block';
    } else {
    signoutBtn.style.display = 'none';
}

      updateReadingList(); // Optional: refresh user's reading list
    } else {
      authMessage.textContent = 'Invalid credentials.';
    }
  } catch (error) {
    authMessage.textContent = 'Error signing in. Please try again.';
    console.error(error);
  }
});

// Fetch books from OpenLibrary based on search query and optional genre fi
function fetchBooks(query, genre = '') {
  const terms = [];
  if (query) terms.push(query);
  if (genre) terms.push(`subject:${genre}`);

    // If no search terms, default to "the" to return some results
   if (terms.length === 0) {
    terms.push('the');
  }
  const qs = terms.join(' ');
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(qs)}&limit=100`;

  return fetch(url)
    .then(res => res.json())
    .then(data =>
      data.docs
              .map(doc => ({
          id: doc.key,
          title: doc.title,
          author: doc.author_name?.[0] || 'Unknown',
          year: doc.first_publish_year,
          subjects: doc.subject || [],
          coverId: doc.cover_i || null,
        }))
    );
}

// Fetch a list of trending books using random keywords
function fetchTrendingBooks() {
  const trendingKeywords = ['bestseller', 'popular'];
  const randomKeyword = trendingKeywords[Math.floor(Math.random() * trendingKeywords.length)];
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(randomKeyword)}&limit=20`;

  console.log('Fetching trending books from:', url);

  return fetch(url)
    .then(res => res.json())
    .then(data =>
      data.docs.map(doc => ({
        id: doc.key,
        title: doc.title,
        author: doc.author_name?.[0] || 'Unknown',
        year: doc.first_publish_year,
        subjects: doc.subject || [],
        coverId: doc.cover_i || null,
      }))
    );
}

// Sort books by year published either newest first or oldest first
function sortBooksByYear(books, sortOrder) {
  if (sortOrder === 'newest') {
    return books.sort((a, b) => b.year - a.year);
  } else if (sortOrder === 'oldest') {
    return books.sort((a, b) => a.year - b.year);
  }
  return books;
}

// Fetch books, trending books, and user reading list, then render
async function handleFetchAndRender() {
  booksContainer.innerHTML = '<p>Loading...</p>';
  trendingBooksContainer.innerHTML = '<p>Loading trending books...</p>';

  let query = searchInput.value.trim();
  const genre = genreFilter.value;
  const sortOrder = document.getElementById('sortByYear').value;

  try {
    const [books, trendingBooks, readingList] = await Promise.all([
  fetchBooks(query, genre),
  fetchTrendingBooks(),
  fetchReadingList(currentUser?.id)
]);

    console.log('Fetched books:', books.length);
    console.log('Reading list:', readingList.length);

    const sorted = sortBooksByYear(books, sortOrder);
    renderBooks(sorted.slice(0, 30), readingList); 

  } catch (e) {
    console.error(e);
    booksContainer.innerHTML = `<p>Failed to load books. Try again later.</p>`;
    trendingBooksContainer.innerHTML = `<p>Failed to load trending books.</p>`;
  }
}

// Render trending books section with cards//
 async function renderTrendingBooks() {
  const trendingBooksContainer = document.getElementById('trendingBooksContainer');
  trendingBooksContainer.innerHTML = '<p>Loading trending books...</p>';

  try {
    const trendingBooks = await fetchTrendingBooks();
    const readingList = await fetchReadingList(currentUser?.id);
    trendingBooksContainer.innerHTML = '';

    trendingBooks.slice(0, 30).forEach(book => {
      const coverUrl = book.coverId
        ? `https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg`
        : 'https://placehold.co/128x193?text=No+Cover'


      const openLibraryUrl = `https://openlibrary.org${book.id}`;

      const card = document.createElement('article');
      card.className = 'book-card';

      const alreadyInList = readingList.some(item => item.bookId === book.id);

      card.innerHTML = `
        <a href="${openLibraryUrl}" target="_blank" rel="noopener noreferrer">
          <img src="${coverUrl}" alt="Cover of ${book.title}" class="book-cover">
          <h3>${book.title}</h3>
        </a>
        <p><strong>Author:</strong> ${book.author}</p>
        <p><strong>Year:</strong> ${book.year}</p>
        <button data-id="${book.id}" class="add-to-list-btn" ${alreadyInList ? 'disabled' : ''}>
          ${alreadyInList ? 'In Reading List' : 'Add to Reading List'}
        </button>
      `;

      trendingBooksContainer.appendChild(card);
    });

    addBookButtons(trendingBooks);
  } catch (error) {
    console.error('Failed to load trending books:', error);
    trendingBooksContainer.innerHTML = '<p>Could not load trending books. Try again later.</p>';
  }
}


// Fetch the reading list for a specific user from backend
function fetchReadingList(userId) {
  if (!userId) return Promise.resolve([]);

  return fetch(`${JSON_SERVER_URL}/readingList?userId=${userId}`)
    .then(async res => {
      if (!res.ok) {
        const errorText = await res.text();  // Read the raw error (HTML in this case)
        console.error('Failed to fetch reading list:', res.status, errorText);
        throw new Error(`Reading list fetch failed with status ${res.status}`);
      }
      return res.json();
    });
}

// Add a book to the reading list (backend and UI)
async function handleAddToList(bookId, books) {
  if (!currentUser) {
    alert('Please sign in to add books to your reading list.');
    return;
  }

  const book = books.find(b => b.id === bookId);
  const readingList = await fetchReadingList(currentUser.id);
  const alreadyInList = readingList.some(item => item.bookId === bookId);
  if (alreadyInList) {
    readingListMessage.textContent = 'Book is already in your reading list.';
    readingListMessage.style.color = 'orange';
    return;
  }

  // Add book
  await fetch(`${JSON_SERVER_URL}/readingList`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: currentUser.id,
      bookId: book.id,
      title: book.title,
      author: book.author,
      year: book.year,
      status: 'Want to Read',
      note: '',
      rating: 0
    })
  });

  readingListMessage.textContent = `"${book.title}" added to your reading list!`;
  readingListMessage.style.color = 'green';

  updateReadingList();
  handleFetchAndRender();
}

// Render book cards in the main books container
function renderBooks(books, readingList = []) {
  booksContainer.innerHTML = '';

  books.forEach(book => {
    const coverUrl = book.coverId
      ? `https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg`
      : 'https://via.placeholder.com/128x193?text=No+Cover';

    const openLibraryUrl = `https://openlibrary.org${book.id}`;

    const card = document.createElement('article');
    card.className = 'book-card';

    card.innerHTML = `
      <a href="${openLibraryUrl}" target="_blank" rel="noopener noreferrer">
        <img src="${coverUrl}" alt="Cover of ${book.title}" class="book-cover">
        <h3>${book.title}</h3>
      </a>
      <p><strong>Author:</strong> ${book.author}</p>
      <p><strong>Year:</strong> ${book.year}</p>
      <button data-id="${book.id}" class="add-to-list-btn">Add to Reading List</button>
    `;

    // Disable "Add to Reading List" button if already in user's list
    const alreadyInList = readingList.some(item => item.bookId === book.id);
    if (alreadyInList) {
      const btn = card.querySelector('.add-to-list-btn');
      btn.textContent = 'In Reading List';
      btn.disabled = true;
    }

    booksContainer.appendChild(card);
  });

  addBookButtons(books);
}

// Update a reading list book's details on backend (PATCH)
function updateBook(id, updatedFields) {
  return fetch(`${JSON_SERVER_URL}/readingList/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedFields)
  });
}

async function handleAddToList(bookId, books) {
  if (!currentUser) {
    alert('Please sign in to add books to your reading list.');
    return;
  }
  const book = books.find(b => b.id === bookId);
  const readingList = await fetchReadingList(currentUser.id);
  const alreadyInList = readingList.some(item => item.bookId === bookId);
  if (alreadyInList) {
    readingListMessage.textContent = 'Book is already in your reading list.';
    readingListMessage.style.color = 'orange';
    return;
  }
  // add book
  await fetch(`${JSON_SERVER_URL}/readingList`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: currentUser.id,
      bookId: book.id,
      title: book.title,
      author: book.author,
      year: book.year,
      status: 'Want to Read',
      note: '',
      rating: 0
    })
  });
  readingListMessage.textContent = `"${book.title}" added to your reading list!`;
  readingListMessage.style.color = 'green';
  updateReadingList();
  handleFetchAndRender();
}

// Update the reading list UI based on current user data
async function updateReadingList() {
  if (!readingListItems) {
    console.error('readingListItems element not found in DOM');
    return;
  }

  if (!currentUser) {
    readingListItems.innerHTML = '<p>Please sign in to see your reading list.</p>';
    return;
  }

  try {
    const readingList = await fetchReadingList(currentUser.id);
    console.log('Reading List data:', readingList);

    if (!Array.isArray(readingList) || readingList.length === 0) {
      readingListItems.innerHTML = '<p>Your reading list is empty.</p>';
      return;
    }

    readingListItems.innerHTML = ''; // clear previous list

    readingList.forEach(book => {
      // Construct cover image URL or fallback placeholder
      const imageUrl = book.coverId
        ? `https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg`
        : './images/no-cover.jpg'; 

      // Create a container element (li or div) for the book
      const li = document.createElement('li');
      li.className = 'reading-list-item';

      li.innerHTML = `
        <div class="reading-list-header">
          <img src="${imageUrl}" alt="Cover of ${book.title}" style="height: 100px; margin-right: 10px; float: left; border-radius: 4px;">
          <div>
            <strong>${book.title}</strong> by ${book.author} (${book.year})
            <button class="toggle-details">Details</button>
          </div>
          <div style="clear: both;"></div>
        </div>
        <div class="reading-list-details" style="display: none;">
          <label>Status:
            <select class="status-select">
              <option ${book.status === 'Want to Read' ? 'selected' : ''}>Want to Read</option>
              <option ${book.status === 'Reading' ? 'selected' : ''}>Reading</option>
              <option ${book.status === 'Finished' ? 'selected' : ''}>Finished</option>
            </select>
          </label><br/>
          <label>Note:<br/>
            <textarea class="note-input" rows="2">${book.note || ''}</textarea>
          </label><br/>
          <label>Rating:
            <input type="number" class="rating-input" value="${book.rating || 0}" min="0" max="5" />
          </label><br/>
          <button class="save-btn">Save</button>
          <button class="remove-btn">Remove</button>
        </div>
      `;

      // Toggle details panel
      const toggleBtn = li.querySelector('.toggle-details');
      const details = li.querySelector('.reading-list-details');
      toggleBtn.addEventListener('click', e => {
        e.stopPropagation();
        details.style.display = details.style.display === 'block' ? 'none' : 'block';
      });

      // Save button updates backend
      li.querySelector('.save-btn').addEventListener('click', async () => {
        const status = li.querySelector('.status-select').value;
        const note = li.querySelector('.note-input').value;
        const rating = parseInt(li.querySelector('.rating-input').value, 10);
        await updateBook(book.id, { status, note, rating });
      });

      // Remove button deletes book from reading list
      li.querySelector('.remove-btn').addEventListener('click', async () => {
        try {
          await fetch(`${JSON_SERVER_URL}/readingList/${book.id}`, { method: 'DELETE' });
          readingListMessage.textContent = `"${book.title}" removed from your reading list.`;
          readingListMessage.style.color = 'green';
          updateReadingList();
        } catch {
          readingListMessage.textContent = 'Failed to remove book.';
          readingListMessage.style.color = 'red';
        }
      });

      // Update backend immediately when status changes
      li.querySelector('.status-select').addEventListener('change', e => {
        updateBook(book.id, { status: e.target.value });
      });

      // Update backend on note input (could debounce)
      li.querySelector('.note-input').addEventListener('input', e => {
        updateBook(book.id, { note: e.target.value });
      });

      // Update backend on rating change
      li.querySelector('.rating-input').addEventListener('change', e => {
        const rating = parseInt(e.target.value, 10);
        updateBook(book.id, { rating });
      });

      readingListItems.appendChild(li);
    });
  } catch (error) {
    console.error('Error updating reading list:', error);
    readingListItems.innerHTML = '<p>Failed to load reading list.</p>';
  }
}

// Setup event listeners for user inputs and buttons
function setupEventListeners() {
  searchInput.addEventListener('input', debounce(handleFetchAndRender, 500));
  genreFilter.addEventListener('change', handleFetchAndRender);
  toggleThemeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
  });
}

// Attach click handlers to "Add to Reading List" buttons dynamically
function addBookButtons(currentBooks) {
  document.querySelectorAll('.add-to-list-btn').forEach(button => {
    button.addEventListener('click', async (e) => {
      e.preventDefault();  // <-- Prevent default behavior (reload)
      const bookId = e.target.dataset.id;
      await handleAddToList(bookId, currentBooks);
    });
  });
}

// Debounce helper to limit rapid-fire calls on user input
function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

// Format genre slug strings to human-readable form (underscores to spaces, capitalize words)
function formatGenreName(slug) {
  return slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Populate genre dropdown with predefined popular genres
function populateGenreDropdown() {
  const genreFilter = document.getElementById('genreFilter');
  genreFilter.innerHTML = '<option value="">All Genres</option>';

  const popularGenres = [
    'fantasy', 'science_fiction', 'romance', 'mystery',
    'thriller', 'horror', 'historical_fiction', 'young_adult',
    'children', 'adventure', 'poetry', 'history', 'nonfiction', 'classics'
  ];

  popularGenres.forEach(slug => {
    const option = document.createElement('option');
    option.value = slug;
    option.textContent = formatGenreName(slug);
    genreFilter.appendChild(option);
  });
}

function signOut() {
  currentUser = null;
  localStorage.removeItem('currentUser');
  authMessage.textContent = 'Signed out.';
  document.getElementById('authContainer').style.display = 'block';
  updateReadingList();
}

// Main initialization: populate genres, fetch and render books, setup listeners
function init() {
  populateGenreDropdown();
  handleFetchAndRender();
  setupEventListeners();
  updateReadingList();
  renderTrendingBooks();
}

const savedUser = localStorage.getItem('currentUser');
if (savedUser) {
  currentUser = JSON.parse(savedUser);
  authMessage.textContent = `Signed in as ${currentUser.username}`;
  document.getElementById('authContainer').style.display = 'none';
  updateReadingList();
}

init()