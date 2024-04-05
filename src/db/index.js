import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

// Best Approach to Connect DB
export const connectDB = async () => {
    try {
        const connectInstance = await mongoose.connect(
            `${process.env.MONGODB_URI}/${DB_NAME}`
        );
        console.log(
            `\n mongoose connect ! DB Host: ${connectInstance.connection.host}`
        );
    } catch (error) {
        console.error("mongoose connection error: ", error);
        process.exit(1);
    }
};

// First Approach
// import express from 'express'
// const app = express()
// (async () => {
//   try {
//     mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//     app.on('error',(error) => {
//         console.log('ERROR: ', error)
//         throw error
//     })

//     app.listen(process.env.PORT || 8000 , () => {
//         console.log(`App is listen on port: ${process.env.PORT}`)
//     })
//   } catch (error) {
//     console.error(error);
//   }
// })();
