const searchInput = document.getElementById('searchInput');
const genreFilter = document.getElementById('genreFilter');
const booksContainer = document.getElementById('booksContainer');
const readingListItems = document.getElementById('readingListItems');
const toggleThemeBtn = document.getElementById('toggleThemeBtn');

const JSON_SERVER_URL = 'http://localhost:3000';

function fetchBooks(query, genre = '') {
  if (genre) {
    const subjectUrl = `https://openlibrary.org/subjects/${genre.toLowerCase().replace(/\s+/g, '_')}.json?limit=20`;
    console.log(`Fetching subject: ${subjectUrl}`);

    return fetch(subjectUrl)
      .then(res => res.json())
      .then(data => data.works.map(book => ({
        id: book.key,
        title: book.title,
        author: book.authors?.[0]?.name || 'Unknown',
        year: book.first_publish_year || 0,
        subjects: [genre],
        coverId: book.cover_id || null,
        editionCount: book.edition_count || 0, // proxy for popularity
        rating: book.rating?.average || 0       // optional, rarely available
      })));
  }

  const fallbackQuery = query || 'fiction';
  const searchUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(fallbackQuery)}&limit=20`;
  console.log(`Searching books by query: ${searchUrl}`);

  return fetch(searchUrl)
    .then(res => res.json())
    .then(data => data.docs.map(book => ({
      id: book.key,
      title: book.title,
      author: book.author_name?.[0] || 'Unknown',
      year: book.first_publish_year || 0,
      subjects: book.subject || [],
      coverId: book.cover_i || null,
      editionCount: book.edition_count || 0,
      rating: book.ratings_average || 0
    })));
}

async function handleFetchAndRender() {
  booksContainer.innerHTML = '<p>Loading...</p>'; // add this

  const query = searchInput.value.trim();
  const genre = genreFilter.value;
  const sortOrder = document.getElementById('sortBy')?.value || 'newest';
  const yearFrom = parseInt(document.getElementById('yearFrom')?.value) || 0;
  const yearTo = parseInt(document.getElementById('yearTo')?.value) || 9999;

  try {
    const [books, readingList] = await Promise.all([
      fetchBooks(query, genre),
      fetchReadingList()
    ]);

  const filteredBooks = books
  .filter(book => book.year && !isNaN(book.year))
  .filter(book => book.year >= yearFrom && book.year <= yearTo);
  
    const sortedBooks = sortBooks(filteredBooks, sortOrder);
    renderBooks(sortedBooks, readingList);
  } catch (error) {
    console.error('Error:', error);
    booksContainer.innerHTML = `<p>Failed to load books. Try again later.</p>`;
  }
}


const currentYear = new Date().getFullYear();
document.getElementById('yearFrom').value = currentYear;
document.getElementById('yearTo').value = currentYear;


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
    li.innerHTML = `
      <strong>${book.title}</strong> by ${book.author} (${book.year})<br/>
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
      <button class="remove-btn">Remove</button>
    `;

    li.querySelector('.status-select').addEventListener('change', (e) => {
      updateBook(book.id, { status: e.target.value });
    });

    li.querySelector('.note-input').addEventListener('input', (e) => {
      updateBook(book.id, { note: e.target.value });
    });

    li.querySelector('.rating-input').addEventListener('input', (e) => {
      updateBook(book.id, { rating: parseInt(e.target.value) });
    });

    li.querySelector('.remove-btn').addEventListener('click', () => {
      fetch(`${JSON_SERVER_URL}/readingList/${book.id}`, { method: 'DELETE' })
        .then(() => updateReadingList());
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

 function sortBooks(books, sortBy) {
  switch (sortBy) {
    case 'newest':
      return books.sort((a, b) => b.year - a.year);
    case 'oldest':
      return books.sort((a, b) => a.year - b.year);
    case 'popular':
      return books.sort((a, b) => b.editionCount - a.editionCount);
    case 'rating':
      return books.sort((a, b) => b.rating - a.rating);
    default:
      return books;
  }
}


function populateYearDropdowns() {
  const currentYear = new Date().getFullYear();
  const startYear = 1430;

  const yearFrom = document.getElementById('yearFrom');
  const yearTo = document.getElementById('yearTo');

  for (let year = currentYear; year >= startYear; year--) {
    const optionFrom = document.createElement('option');
    optionFrom.value = year;
    optionFrom.textContent = year;
    yearFrom.appendChild(optionFrom);

    const optionTo = document.createElement('option');
    optionTo.value = year;
    optionTo.textContent = year;
    yearTo.appendChild(optionTo);
  }

  // Set default values
  yearFrom.value = startYear;
  yearTo.value = currentYear;
}

function init() {
  populateGenreDropdown();
  populateYearDropdowns();
  handleFetchAndRender();
  setupEventListeners();
  updateReadingList();
}

init();
