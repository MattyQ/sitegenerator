const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const app = express();
const port = 3000;
const cors = require('cors');

// Define the domain for the generated pages
const domain = 'https://sitegenerator.qfd.repl.co';

// Permissive CORS
app.use(cors());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Parse JSON request bodies
app.use(express.json());

// Define the maximum age (in milliseconds) for pages before they are deleted
const maxPageAge = 10 * 60 * 1000; // 10 minutes

// In-memory store to hold incomplete HTML content
const incompleteHtmlStore = new Map();

// Generate a token for each incomplete HTML content
const generateToken = () => crypto.randomBytes(16).toString('hex');

// Cleanup function to delete old pages
const cleanupOldPages = async () => {
  try {
    const pagesDir = path.join(__dirname, 'pages');
    const now = Date.now();
    const directories = await fs.readdir(pagesDir, {
      withFileTypes: true
    });
    for (const dirent of directories) {
      if (dirent.isDirectory()) {
        const directoryPath = path.join(pagesDir, dirent.name);
        const stats = await fs.stat(directoryPath);
        if (now - stats.birthtimeMs > maxPageAge) {
          await fs.rm(directoryPath, {
            recursive: true,
            force: true
          });
          console.log(`Directory deleted: ${dirent.name}`);
        }
      }
    }
  } catch (error) {
    console.error(`Failed to clean up old pages: ${error.message}`);
  }
};

// Periodically run the cleanup function
setInterval(cleanupOldPages, maxPageAge);

// Define the /page endpoint to create a new page with the provided HTML content
app.post('/page', async (req, res) => {
  try {
    // Extract the HTML content from the request body
    const {
      html
    } = req.body;

    // Validate that the HTML content is a string
    if (typeof html !== 'string') {
      return res.status(400).json({
        error: 'HTML content must be a string.'
      });
    }

    // Validate that the HTML content contains an HTML tag
    if (!html.includes('<html')) {
      return res.status(400).json({
        error: 'HTML content must include the <html> tag.'
      });
    }

    // Check if the HTML content is incomplete
    if (html.includes('<html') && !html.includes('</html>')) {
      // Generate a token and store the incomplete HTML content
      const token = generateToken();
      incompleteHtmlStore.set(token, html);

      // Send a response with instructions to append more HTML
      return res.json({
        message: 'It appears the HTML document you sent was incomplete. ' +
          'To append more HTML to this document, you must use the token ' +
          'we sent with the append endpoint to deliver the rest of your HTML. ' +
          'When we receive a closing </html> tag, we\'ll respond with the URL ' +
          'for the complete page. Continue exactly from where you left off ' +
          'in the code and we\'ll concatenate your HTML.',
        token: token
      });
    }

    // Generate a random directory and filename for the page
    const directoryName = crypto.randomBytes(8).toString('hex');
    const filename = 'index.html';

    // Create the "pages" directory if it doesn't exist
    const pagesDir = path.join(__dirname, 'pages');
    try {
      await fs.access(pagesDir);
    } catch {
      await fs.mkdir(pagesDir);
    }

    // Create a unique directory for the page
    const pageDir = path.join(pagesDir, directoryName);
    await fs.mkdir(pageDir);

    // Build the complete HTML document
    const completeHtml = `
  ${html}
  <div id="floatingModal" style="z-index:1; position:fixed; bottom:20px; right:20px; background-color:#f9f9f9; padding:10px; border-radius:5px; box-shadow:0 0 10px rgba(0,0,0,0.1);">
    <button onclick="copyHtml()">Copy HTML</button>
    <script>
      function copyHtml() {
        const injectedContent = document.getElementById('floatingModal').outerHTML;
        const htmlContent = document.documentElement.outerHTML.replace(injectedContent, '');
        navigator.clipboard.writeText(htmlContent);
      }
    </script>
  </div>
`;

    // Save the HTML content as a file in the unique directory
    await fs.writeFile(path.join(pageDir, filename), completeHtml);

    // Return the URL of the new page on our server to the client
    res.json({
      pageUrl: `${domain}/pages/${directoryName}/${filename}`
    });
  } catch (error) {
    // Handle errors and return an error message
    res.status(500).json({
      error: error.message
    });
  }
});

// Define the /append endpoint to append more HTML content
app.post('/append', async (req, res) => {
  try {
    // Extract the token and additional HTML content from the request body
    const {
      token,
      html
    } = req.body;

    // Validate the token and HTML content
    if (!token || !incompleteHtmlStore.has(token)) {
      return res.status(400).json({
        error: 'Invalid token.'
      });
    }
    if (typeof html !== 'string') {
      return res.status(400).json({
        error: 'HTML content must be a string.'
      });
    }

    // Append the additional HTML content
    const currentHtml = incompleteHtmlStore.get(token);
    const newHtml = currentHtml + html;

    // Check if the HTML content is now complete
    if (newHtml.includes('</html>')) {
      // Remove the token from the store
      incompleteHtmlStore.delete(token);

      // Generate a random directory and filename for the page
      const directoryName = crypto.randomBytes(8).toString('hex');
      const filename = 'index.html';

      // Create the "pages" directory if it doesn't exist
      const pagesDir = path.join(__dirname, 'pages');
      try {
        await fs.access(pagesDir);
      } catch {
        await fs.mkdir(pagesDir);
      }

      // Create a unique directory for the page
      const pageDir = path.join(pagesDir, directoryName);
      await fs.mkdir(pageDir);

      // Build the complete HTML document
      const completeHtml = `
    ${newHtml}
    <div id="floatingModal" style="z-index:1; position:fixed; bottom:20px; right:20px; background-color:#f9f9f9; padding:10px; border-radius:5px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
    <button onclick="copyHtml()">Copy HTML</button>
    <script>
      function copyHtml() {
        const injectedContent = document.getElementById('floatingModal').outerHTML;
        const htmlContent = document.documentElement.outerHTML.replace(injectedContent, '');
        navigator.clipboard.writeText(htmlContent);
      }
    </script>
  </div>
  
`;

      // Save the HTML content as a file in the unique directory
      await fs.writeFile(path.join(pageDir, filename), completeHtml);

      // Return the URL of the new page on our server to the client
      res.json({
        pageUrl: `${domain}/pages/${directoryName}/${filename}`
      });
    } else {
      // Update the store with the new HTML content
      incompleteHtmlStore.set(token, newHtml);

      // Send a response with instructions to append more HTML
      return res.json({
        message: 'The HTML document is still incomplete. ' +
          'Continue appending more HTML using the same token.',
        token: token
      });
    }
  } catch (error) {
    // Handle errors and return an error message
    res.status(500).json({
      error: error.message
    });
  }
});

// Custom middleware to serve pages and delete them after two minutes
app.get('/pages/:directory/:filename', async (req, res) => {
  const directory = req.params.directory;
  const filename = req.params.filename;
  const pageDir = path.join(__dirname, 'pages', directory);
  const filePath = path.join(pageDir, filename);

  try {
    // Check if the file exists
    await fs.access(filePath);
    // Set a timeout to delete the entire directory after two minutes (120000 milliseconds)
    setTimeout(async () => {
      try {
        await fs.rm(pageDir, {
          recursive: true,
          force: true
        });
        console.log(`Directory deleted: ${directory}`);
      } catch (err) {
        console.error(`Failed to delete directory: ${directory}`);
      }
    }, 120000);

    // Send the file as a response
    res.sendFile(filePath);
  } catch {
    // If the file does not exist, return a 404 status
    res.status(404).send('File not found');
  }
});

// Start the server and listen for incoming requests
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
