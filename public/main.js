document.addEventListener('DOMContentLoaded', () => {
  console.log('Welcome to the TEAM page!');
  const form = document.getElementById('cardForm');
  const darkModeToggle = document.getElementById('darkModeToggle');
  const darkModeToggleLabelText = document.getElementById('darkModeToggleLabelText');
  const submitButton = document.getElementById('createRequestButton');

  // Check if dark mode is enabled in local storage
  const isDarkModeEnabled = localStorage.getItem('darkModeEnabled') === 'true';

  // Set the initial mode based on the value in local storage
  if (isDarkModeEnabled) {
    document.documentElement.classList.add('dark-mode');
    darkModeToggle.checked = true;
  }

  // Toggle dark mode when the toggle switch or label text is clicked
  darkModeToggle.addEventListener('change', themeToggle);
  darkModeToggleLabelText.addEventListener('click', () => {
    // trigger the change event on the checkbox
    darkModeToggle.checked = !darkModeToggle.checked;
    themeToggle();
  });

  function themeToggle() {
    console.log('Dark mode toggled');
    document.documentElement.classList.toggle('dark-mode');
    const isDarkModeEnabled = document.documentElement.classList.contains('dark-mode');
    console.log('Dark mode enabled:', isDarkModeEnabled);
    localStorage.setItem('darkModeEnabled', isDarkModeEnabled);
  }

  // Hide the default "Choose.." option in the dropdowns since apple devices don't support the "hidden" attribute
  // This is also the window onload function, so if there's something else you want to do on load, add it here
  window.onload = function () {
    var selects = document.querySelectorAll('select');
    selects.forEach(function (select) {
      select.addEventListener('change', function () {
        this.querySelector('option[value=""]').disabled = true;
      });
    });

    // Collect and display the version number of the app on the version-number div
    fetch('/version').then((response) => {
      return response.json();
    }).then((data) => {
      const versionNumber = data.version;
      document.getElementById('version-number').innerText = 'v' + versionNumber;
    });

    // Fetch and populate the events dropdown from config
    fetch('/events').then((response) => {
      return response.json();
    }).then((data) => {
      const eventSelect = document.getElementById('event');
      eventSelect.innerHTML = ''; // Clear loading placeholder
      data.events.forEach((event) => {
        const option = document.createElement('option');
        option.value = event;
        option.textContent = event;
        if (event === data.defaultEvent) {
          option.selected = true;
        }
        eventSelect.appendChild(option);
      });
    }).catch((error) => {
      console.error('Error fetching events:', error);
      const eventSelect = document.getElementById('event');
      eventSelect.innerHTML = '<option value="" selected>Error loading events</option>';
    });
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    // Change submit button text to "Submitting..."
    submitButton.innerText = 'Submitting...';

    // Prevent the button from being clicked multiple times
    submitButton.disabled = true;

    // Retrieve form data
    const title = document.getElementById('title').value;
    const teamNumber = document.getElementById('teamNumber').value;
    const contactEmail = document.getElementById('contactEmail').value;
    const contactName = document.getElementById('contactName').value;
    const frcEvent = document.getElementById('event').value;
    const problemCategory = document.getElementById('problemCategory').value;
    const description = document.getElementById('description').value;
    const attachments = document.getElementById('attachments').files;
    const priority = document.getElementById('priority').value + ' priority';

    // If there are attachments, set button text to "Uploading..."
    if (attachments.length > 0) {
      submitButton.innerText = 'Uploading...';
    }

    // Prepare attachments file data to send over json post
    let filePromises = Array.from(attachments).map((file) => {
      return new Promise((resolve, reject) => {
        let reader = new FileReader();
        reader.onload = function (event) {
          // Remove 'data:*/*;base64,' metadata from the start of the string
          let base64String = event.target.result.split('base64,')[1];
          resolve({ name: file.name, data: base64String });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    Promise.all(filePromises).then((base64Files) => {
      // Construct Trello card object
      const card = {
        title,
        teamNumber,
        contactEmail,
        contactName,
        frcEvent,
        problemCategory,
        priority,
        description,
        attachments: base64Files
      };

      console.log('Submitting card data:');
      console.log({ ...card, attachments: card.attachments.length });

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
        // Set the button text back to "Submit"
        submitButton.innerText = 'Submit';
        successMessage.style.display = 'flex';
        setTimeout(() => {
          successMessage.style.display = 'none';
          // Re-enable the submit button
          submitButton.disabled = false;
        }, 5000);
        // Clear the form
        document.getElementById('cardForm').reset();
      }).then(data => {
        // Handle the response from the server
        if (data) console.log(data);
      }).catch(error => {
        // Handle any errors
        console.error('Error:', error);
        // Display an error message to the user
        alert('An error occurred. Please try again.');
      });
    });
  });
});