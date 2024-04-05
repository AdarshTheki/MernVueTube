import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

// Best Approach to Connect DB
const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(
            `${process.env.MONGODB_URI}/${DB_NAME}`
        );
        console.log(
            `\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`
        );
    } catch (error) {
        console.log("MONGODB connection FAILED ", error);
        process.exit(1);
    }
};

export default connectDB;

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
