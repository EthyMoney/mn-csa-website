document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('cardForm');
  const darkModeToggle = document.getElementById('darkModeToggle');

  // Check if dark mode is enabled in local storage
  const isDarkModeEnabled = localStorage.getItem('darkModeEnabled') === 'true';

  // Set the initial mode based on the value in local storage
  if (isDarkModeEnabled) {
    document.documentElement.classList.add('dark-mode');
    darkModeToggle.checked = true;
  }

  // Toggle dark mode when the toggle switch is clicked
  darkModeToggle.addEventListener('change', () => {
    console.log('Dark mode toggled')
    document.documentElement.classList.toggle('dark-mode');
    const isDarkModeEnabled = document.documentElement.classList.contains('dark-mode');
    console.log('Dark mode enabled:', isDarkModeEnabled)
    localStorage.setItem('darkModeEnabled', isDarkModeEnabled);
  });

  // Hide the default "Choose.." option in the dropdowns since apple devices don't support the "hidden" attribute
  // This is also the window onload function, so if there's something else you want to do on load, add it here
  window.onload = function () {
    var selects = document.querySelectorAll('select');
    selects.forEach(function (select) {
      select.addEventListener('change', function () {
        this.querySelector('option[value=""]').disabled = true;
      });
    });
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    // Retrieve form data
    const title = document.getElementById('title').value;
    const teamNumber = document.getElementById('teamNumber').value;
    const contactEmail = document.getElementById('contactEmail').value;
    const frcEvent = document.getElementById('event').value;
    const problemCategory = document.getElementById('problemCategory').value;
    const description = document.getElementById('description').value;
    const attachments = document.getElementById('attachments').files;
    const priority = document.getElementById('priority').value + " priority";


    // Construct Trello card object
    const card = {
      title,
      teamNumber,
      contactEmail,
      frcEvent,
      problemCategory,
      priority,
      description,
      attachments
    };

    console.log('Card:', card)

    // Make an HTTP POST request to create a Trello card
    fetch('/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(card)
    }).then(response => {
      response.json();
      // Display a success message to the user
      const successMessage = document.getElementById('success-message');
      successMessage.style.display = 'flex';
      setTimeout(() => {
        successMessage.style.display = 'none';
      }, 5000);
      // Clear the form
      document.getElementById('cardForm').reset();
    }).then(data => {
      // Handle the response from the server
      console.log(data);
    }).catch(error => {
      // Handle any errors
      console.error('Error:', error);
      // Display an error message to the user
      alert('An error occurred. Please try again.');
    });
  });
});