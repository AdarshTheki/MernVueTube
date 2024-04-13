# My Awesome Backend

This project is a complex backend project that is built with `node.js`, `express.js`, `mongoDB`, `mongoose`, `jwt`, `bcrypt`, `cloudinary`, and many more. This project is a complete backend project that has all the features that a backend project should have. We are building a complete video hosting website similar to youtube with all the features like `login`, `register`, `upload image/video`, `like`, `dislike`, `comment`, `reply`, `subscribe`, `unsubscribe`, and many more.

## Getting Started

1. Clone this repository to your local machine.
2. Install the required dependencies using `npm install`.
3. Create a `.env` file and configure your environment variables (e.g., database connection string, secret keys).
4. Run the server using `npm start`.

## Features

### User Management

- **User Controller**: Handles user registration, login, and authentication.
- **User Model**: Defines the user schema and interacts with the database.
- **Authentication Middleware**: Protects routes using JSON Web Tokens (JWT).

### Likes

- **Like Controller**: Manages likes for various content (videos, tweets, etc.).

### Videos

- **Video Controller**: Handles video uploads, retrieval, and management.
- **Video Model**: Defines the video schema and interacts with the database.
- **Multer Middleware**: Used for handling file uploads (e.g., video files).

### Subscriptions

- **Subscription Controller**: Manages user subscriptions to channels or content.

### Playlists

- **Playlist Controller**: Handles playlist creation, modification, and retrieval.

### Tweets

- **Tweet Controller**: Manages tweets (short messages) from users.

### Comments

- **Comment Controller**: Handles comments on videos, tweets, etc.
- **Comment Model**: Defines the comment schema and interacts with the database.

### Dashboard

- **Dashboard Controller**: Provides statistics and insights (e.g., total video views, subscribers, likes).

## Packages Used

- **cloudinary**: For image and video storage and manipulation.
- **cookie-parser**: Middleware for handling cookies.
- **dotenv**: Loads environment variables from a `.env` file.
- **cors**: Enables cross-origin resource sharing.
- **express**: Web application framework for Node.js.
- **jsonwebtoken**: For creating and verifying JWTs.
- **mongoose**: MongoDB object modeling tool.
- **multer**: Middleware for handling file uploads.

## Contributing

Feel free to contribute by opening issues or submitting pull requests. Let's make this backend even more awesome!
