Site Generator Plugin
=====================

The Site Generator plugin is a tool that allows users to create temporary web pages based on provided HTML content. It exposes an API to create and manage temporary web pages.

Getting Started
---------------

Before using the Site Generator plugin, make sure to install the necessary dependencies by running the following command in your project directory:

`npm install`

After installing the dependencies, start the server by running:

`npm start`

This will start the server on port 3000.

API Endpoints
-------------

The Site Generator plugin exposes two API endpoints:

1.  **Create Page** (`POST /page`): Create a temporary web page with the provided HTML content. If the HTML content is incomplete, you will receive a token to append more HTML content.
2.  **Append HTML** (`POST /append`): Append more HTML content to an incomplete HTML document using the provided token. If the HTML content is still incomplete, you will receive the same token to continue appending.

API Usage
---------

### Create a Page

To create a page, send a `POST` request to the `/page` endpoint with the HTML content in the request body. The HTML content must be a string.

`POST /page HTTP/1.1 Content-Type: application/json  {   "html": "<!DOCTYPE html><html><head><title>My Temporary Page</title></head><body><h1>Hello, World!</h1></body></html>" }`

If the provided HTML content is complete (i.e., it contains the `</html>` closing tag), the API will create a temporary web page and return the URL to access it. If the HTML content is incomplete (i.e., the `</html>` tag is missing), the API will respond with a token that you must use to continue your code.

### Append HTML Content

To append more HTML content to an incomplete HTML document, send a `POST` request to the `/append` endpoint with the token and the additional HTML content in the request body. The token must be a valid token received from the `/page` endpoint, and the additional HTML content must be a string.

`POST /append HTTP/1.1 Content-Type: application/json  {   "token": "your_token_here",   "html": "</body></html>" }`

If the appended HTML content completes the HTML document (i.e., it now contains the `</html>` closing tag), the API will create a temporary web page and return the URL to access it. If the HTML content is still incomplete, the API will respond with the same token to continue appending more HTML.

Temporary Page Lifespan
-----------------------

When a web page is created successfully, the page is deleted about two minutes after the first time it's accessed. If the page is never accessed, it is automatically deleted after about ten minutes.

Additional Files
----------------

The following additional files are included in this repository:

*   `/public/.well-known/openapi.yaml`: The OpenAPI 3.0.1 specification file for the Site Generator API.
*   `/public/.well-known/ai-plugin.json`: The AI plugin JSON file, which provides information about the Site Generator plugin.
*   `package.json`: The package manifest for this Node.js project.
