

import config from '../config/config'
import app from './express'
import mongoose from 'mongoose'

/**
 * Mongoose Connection configurations
 */
const options = {
  useCreateIndex: true,
  useNewUrlParser: true,
  useFindAndModify: false,
  useUnifiedTopology: true
}

/**
 * Creates a global mongoose promise
 */
mongoose.Promise = global.Promise

/**
 * Connect using the config mongoURI and options
 */
mongoose.connect(config.mongoUri, options)

/**
 * Listen for an error
 */
mongoose.connection.on('error', () => {
  throw new Error(`unable to connect to database: ${config.mongoUri}`)
})

/**
 * Listen on the specified port, and for any errors
 */
app.listen(config.port, () => {
  console.info('Server started on port %s.', config.port)
})
.on("error", (err: any) => {
  console.error("Server Error: ", err)
})
