const searchInput = document.getElementById('searchInput');
const genreFilter = document.getElementById('genreFilter');
const booksContainer = document.getElementById('booksContainer');
const trendingBooksContainer = document.getElementById('trendingBooksContainer');
const readingListItems = document.getElementById('readingListItems');
const toggleThemeBtn = document.getElementById('toggleThemeBtn');
const signupBtn = document.getElementById('signupBtn');
const signinBtn = document.getElementById('signinBtn');
const authMessage = document.getElementById('authMessage');

const JSON_SERVER_URL = 'http://localhost:3000';

let currentUser = null; // Keep track of signed-in user

signupBtn.addEventListener('click', async () => {
  const username = document.getElementById('signupUsername').value.trim();
  const password = document.getElementById('signupPassword').value;

  if (!username || !password) {
    authMessage.textContent = 'Please enter both username and password.';
    return;
  }

  const existing = await fetch(`${JSON_SERVER_URL}/users?username=${username}`).then(res => res.json());
  if (existing.length > 0) {
    authMessage.textContent = 'Username already exists.';
    return;
  }

  await fetch(`${JSON_SERVER_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  authMessage.textContent = 'Sign-up successful. You can now sign in.';
});

signinBtn.addEventListener('click', async () => {
  const username = document.getElementById('signinUsername').value.trim();
  const password = document.getElementById('signinPassword').value;

  const users = await fetch(`${JSON_SERVER_URL}/users?username=${username}&password=${password}`)
    .then(res => res.json());

  if (users.length > 0) {
    currentUser = users[0];
    authMessage.textContent = `Signed in as ${currentUser.username}`;
    // You can hide auth UI and load books now
    document.getElementById('authContainer').style.display = 'none';
    init(); // Load rest of app
  } else {
    authMessage.textContent = 'Invalid credentials.';
  }
});

function fetchBooks(query, genre = '') {
  const terms = [];
  if (query) terms.push(query);
  if (genre) terms.push(`subject:${genre}`);

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

function sortBooksByYear(books, sortOrder) {
  if (sortOrder === 'newest') {
    return books.sort((a, b) => b.year - a.year);
  } else if (sortOrder === 'oldest') {
    return books.sort((a, b) => a.year - b.year);
  }
  return books;
}

async function handleFetchAndRender() {

  booksContainer.innerHTML = '<p>Loading...</p>';
  trendingBooksContainer.innerHTML = '<p>Loading trending books...</p>';

  let query = searchInput.value.trim();
  const genre = genreFilter.value;
  const sortOrder = document.getElementById('sortByYear').value;

  try {
    const [books, , readingList] = await Promise.all([
      fetchBooks(query, genre),
      fetchTrendingBooks(),
      fetchReadingList()
    ]);
    
    console.log('Fetched books:', books.length);
    console.log('Reading list:', readingList.length);

    const sorted = sortBooksByYear(books, sortOrder);
    renderBooks(sorted, readingList);
  } catch (e) {
    console.error(e);
    booksContainer.innerHTML = `<p>Failed to load books. Try again later.</p>`;
    trendingBooksContainer.innerHTML = `<p>Failed to load trending books.</p>`;
  }
}

async function renderTrendingBooks() {
  const trendingBooksContainer = document.getElementById('trendingBooksContainer');
  trendingBooksContainer.innerHTML = '<p>Loading trending books...</p>';

  try {
    const trendingBooks = await fetchTrendingBooks();
    trendingBooksContainer.innerHTML = '';

    trendingBooks.forEach(book => {
      const coverUrl = book.coverId
        ? `https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg`
        : 'https://via.placeholder.com/128x193?text=No+Cover';

      const card = document.createElement('div');
      card.className = 'book-card';

      card.innerHTML = `
        <img src="${coverUrl}" alt="${book.title} cover">
        <h4>${book.title}</h4>
        <p>${book.author}</p>
        <p>${book.year || 'N/A'}</p>
      `;

      trendingBooksContainer.appendChild(card);
    });
  } catch (error) {
    console.error('Failed to load trending books:', error);
    trendingBooksContainer.innerHTML = '<p>Could not load trending books. Try again later.</p>';
  }
}

function fetchReadingList() {
  return fetch(`${JSON_SERVER_URL}/readingList`).then(res => res.json());
}

async function handleAddToList(bookId, books) {
  const book = books.find(b => b.id === bookId);
  const readingList = await fetchReadingList();

  const alreadyInList = readingList.some(item => item.bookId === bookId);
  if (alreadyInList) return;

  const userBook = {
    bookId: book.id,
    title: book.title,
    author: book.author,
    year: book.year,
    status: 'Want to Read',
    note: '',
    rating: 0
  };

  await fetch(`${JSON_SERVER_URL}/readingList`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userBook)
  });

  updateReadingList();
  handleFetchAndRender();
}

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

function updateBook(id, updatedFields) {
  return fetch(`${JSON_SERVER_URL}/readingList/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedFields)
  });
}
async function updateReadingList() {
  const readingList = await fetchReadingList();
  readingListItems.innerHTML = '';

  readingList.forEach(book => {
    const li = document.createElement('li');
    li.className = 'reading-list-item';

    li.innerHTML = `
      <div class="reading-list-header">
        <strong>${book.title}</strong> by ${book.author} (${book.year})
        <button class="toggle-details">Details</button>
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
          <textarea class="note-input" rows="2">${book.note}</textarea>
        </label><br/>
        <label>Rating:
          <input type="number" class="rating-input" value="${book.rating}" min="0" max="5" />
        </label><br/>
        <button class="save-btn">Save</button>
        <button class="remove-btn">Remove</button>
      </div>
    `;

    // Toggle details view
    const toggleBtn = li.querySelector('.toggle-details');
    const details = li.querySelector('.reading-list-details');
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      details.style.display = details.style.display === 'block' ? 'none' : 'block';
    });

    // Save button
    li.querySelector('.save-btn').addEventListener('click', async () => {
      const status = li.querySelector('.status-select').value;
      const note = li.querySelector('.note-input').value;
      const rating = parseInt(li.querySelector('.rating-input').value);
      await updateBook(book.id, { status, note, rating });
    });

    // Remove button
    li.querySelector('.remove-btn').addEventListener('click', () => {
      fetch(`${JSON_SERVER_URL}/readingList/${book.id}`, { method: 'DELETE' })
        .then(() => updateReadingList());
    });

    // Status update
    li.querySelector('.status-select').addEventListener('change', (e) => {
      updateBook(book.id, { status: e.target.value });
    });

    // Note update
    li.querySelector('.note-input').addEventListener('input', (e) => {
      updateBook(book.id, { note: e.target.value });
    });

    // Star rating click
    li.querySelectorAll('.star-rating .star').forEach(star => {
      star.addEventListener('click', async (e) => {
        const rating = parseInt(e.target.dataset.value);
        await updateBook(book.id, { rating });
        updateReadingList(); // refresh stars
      });
    });

    readingListItems.appendChild(li);
  });
}

function setupEventListeners() {
  searchInput.addEventListener('input', debounce(handleFetchAndRender, 500));
  genreFilter.addEventListener('change', handleFetchAndRender);
  toggleThemeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
  });
}

function addBookButtons(currentBooks) {
  document.querySelectorAll('.add-to-list-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      const bookId = e.target.dataset.id;
      handleAddToList(bookId, currentBooks);
    });
  });
}

function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

function formatGenreName(slug) {
  return slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

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

function init() {
  populateGenreDropdown();
  handleFetchAndRender();
  setupEventListeners();
  updateReadingList();
  renderTrendingBooks();
}

init();
