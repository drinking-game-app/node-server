# Node API with Express Server

### Description
The server which handles authentication, session creation & management for the drinking game application. Written in Node.js, Express.js & TypeScript

#### What you need to run this code
1. Node (12.14.1)
2. NPM (6.14.1)
3. MongoDB (4.2.2)

####  How to run this code
1. Make sure MongoDB is running on your system or create an account at https://www.mongodb.com/atlas-signup-from-mlab
2. Clone this repository
3. Run ```cp example.env .env``` and fill in your Mongo URI to the newely created .env file
4. Generate a JWT token and fill it in under JWT_SECRET
5. Open command line in the cloned folder,
   - To install dependencies, run ```  npm install  ```
   - To run the application in development, run ```  npm run start  ```
   - To build the application, run ```  npm run build  ```
6. Open [localhost:3000](http://localhost:3000/) in the browser
---- 