const searchInput = document.getElementById('searchInput');
const genreFilter = document.getElementById('genreFilter');
const booksContainer = document.getElementById('booksContainer');
const readingListItems = document.getElementById('readingListItems');
const toggleThemeBtn = document.getElementById('toggleThemeBtn');

let readingList = [];

async function fetchBooks(query = '') {
  const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}`);
  const data = await response.json();

  const books = data.docs.map(book => ({
    id: book.key,
    title: book.title,
    author: book.author_name ? book.author_name[0] : 'Unknown',
    year: book.first_publish_year || 'N/A',
    subjects: book.subject || []
  }));

  return books.slice(0, 20); // Show up to 20 books
}

async function handleFetchAndRender() {
  const query = searchInput.value.trim();
  const genre = genreFilter.value;

  try {
    const books = await fetchBooks(query);
    const filteredBooks = genre
      ? books.filter(book => book.subjects.includes(genre))
      : books;

    renderBooks(filteredBooks);
    addBookButtons(filteredBooks);

    if (filteredBooks.length === 0) {
      booksContainer.innerHTML = `<p>No books found for your search.</p>`;
    }
  } catch (error) {
    booksContainer.innerHTML = `<p>Error fetching books. Please try again later.</p>`;
    console.error('Fetch error:', error);
  }
}

function renderBooks(books) {
  booksContainer.innerHTML = '';

  books.forEach(book => {
    const card = document.createElement('article');
    card.className = 'book-card';
    card.innerHTML = `
      <h3>${book.title}</h3>
      <p><strong>Author:</strong> ${book.author}</p>
      <p><strong>Year:</strong> ${book.year}</p>
      <button data-id="${book.id}" class="add-to-list-btn">Add to Reading List</button>
    `;

    booksContainer.appendChild(card);
  });
}

function handleAddToList(bookId, books) {
  const book = books.find(b => b.id === bookId);
  const exists = readingList.find(item => item.id === bookId);

  if (!exists) {
    readingList.push(book);
    updateReadingList();
  }
}

function updateReadingList() {
  readingListItems.innerHTML = '';

  readingList.forEach(book => {
    const li = document.createElement('li');
    li.textContent = `${book.title} by ${book.author}`;
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

  genreFilter.addEventListener('change', async () => {
    const query = searchInput.value;
    const genre = genreFilter.value;
    const books = await fetchBooks(query);
    const filtered = genre ? books.filter(b => b.subjects.includes(genre)) : books;
    renderBooks(filtered);
    addBookButtons(filtered);
  });


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

function init() {
  handleFetchAndRender();
  setupEventListeners();
}
init();
