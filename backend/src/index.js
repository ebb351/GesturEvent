//This uses commonJS standard (not ECM modul)

// Import libraries
const { promises: fs } = require("fs");
const Replicate = require("replicate");
const express = require('express');
const path = require('path');
const app = express();
const bodyParser = require('body-parser');

var input_image;
const port = 3000;
const hostname = '127.0.0.1';

//getCartoonImageFromFile("Eli.jpg");


//************************************************
// Server Setup
//************************************************

// Middleware to parse binary data
app.use(bodyParser.raw({ type: 'application/octet-stream', limit: '10mb' }));

// Handle the POST request
app.post('/upload', async (req, res) => {
  const binaryData = req.body;
  console.log(`Received binary data of length: ${binaryData.length}`);
  // Call your function to process the binary data
  const imgUrl = await getCartoonImageFromData(binaryData);
  res.json({ imgUrl:imgUrl });
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Define routes for different pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

//************************************************
// Cartoonify image using Replicate api
//************************************************

async function getCartoonImageFromData(input_image) {
  const replicate = new Replicate({
      auth: process.env.REPLICATE_API_KEY,
  });

  const input = {
      prompt: "a person img in vegas ready to party",
      num_steps: 50,
      input_image: input_image,
    style_name:"Comic book"
  };
  

  try {
    const output = await replicate.run("tencentarc/photomaker:ddfc2b08d209f9fa8c1eca692712918bd449f695dabb4a958da31802a9570fe4", { input });
          console.log(output);
          return output[0];
  } catch (error) {
      console.error("Error running replicate:", error);
  }
}

async function getCartoonImageFromFile(fileName){
  try {
    input_image = await fs.readFile(fileName);
    console.log(input_image);
  } catch (error) {
    console.error("Error reading file:", error);
  }
    await getCartoonImageFromData(input_image)
}

