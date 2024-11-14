const { MongoClient } = require('mongodb')
let uri = '<redacted>'
//let uri = 'mongodb://localhost:27017/kidney'

module.exports = {
    connectToDb: (cb) => {
        MongoClient.connect(uri)
            .then((client) => {
                dbConnection = client.db()
                return cb()
            })
            .catch(err => {
                console.log(err)
                return cb(err)
            })
    },
    getDb: () => dbConnection
}