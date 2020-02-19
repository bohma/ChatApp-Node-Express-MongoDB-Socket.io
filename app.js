const express = require('express')
const app = express();

const MongoClient = require("mongodb").MongoClient
const objectId = require("mongodb").ObjectID;

const bodyParser = require('body-parser')
const server = require('http').createServer(app);
const io = require('socket.io').listen(server);


const urlencodedParser = bodyParser.urlencoded({ extended: false })

let db

const mongoClient = new MongoClient("mongodb://localhost:27017/", { useUnifiedTopology: true });

//Запускаем сервер и подключаем базу данных
app.use(express.static(__dirname))
mongoClient.connect((err, client) => {
    if (err) return console.log(err);
    db = client;
    app.locals.collection = client.db("testdb").collection("testcol");
    server.listen(3000, () => {
        console.log("Сервер создан!");
    });
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});
app.post('/', urlencodedParser, (req, res) => {
    if (!req.body) return res.sendStatus(400)
    res.sendFile(__dirname + '/index.html');
})

//Реализуем вывод сообщения по уникальному идентификатору
app.get('/api/messages/single/:id', (req, res) => {
    const id = new objectId(req.params.id);
    const collection = req.app.locals.collection;
    collection.findOne({ _id: id }, (err, message) => {

        if (err) return console.log(err);
        res.send(message);
    });
});

//Реализуем вывод сообщения по 10 при изменений параметров в адрессной строке
app.get("/api/messages/list/:number", (req, res) => {
    const collection = req.app.locals.collection;
    let n = req.params['number'] //Получение цифры из адрессной строки 
    if (n == 0) {
        collection.find({}).limit(10).toArray((err, message) => {// вывод начальных сообщений с шагом 10

            if (err) return console.log(err);

            res.send(message)
        })
    } else {
        collection.find({}).skip(10 * n).limit(10).toArray((err, message) => {// вывод последующих сообщений с шагом 10

            if (err) return console.log(err);

            res.send(message)
        })
    }
});

// Массив со всеми подключениями
connections = [];

// Функция, которая сработает при подключении к странице
// Считается как новый пользователь
io.sockets.on('connection', (socket) => {
    console.log("Succesful connect");
    // Добавление нового соединения в массив
    connections.push(socket);

    // Функция, которая срабатывает при отключении от сервера
    socket.on('disconnect', (data) => {
        // Удаления пользователя из массива
        connections.splice(connections.indexOf(socket), 1);
        console.log("Disconnect");
    });

    // Функция получающая сообщение от какого-либо пользователя
    socket.on('send mess', (data) => {
        // Внутри функции мы передаем событие 'add mess',
        // которое будет вызвано у всех пользователей и у них добавиться новое сообщение 
        io.sockets.emit('add mess', { name: data.name, email: data.email, text: data.text, });
        //Добавляем полную информацию о сообщении в базу данных
        app.locals.collection.insertOne({ name: data.name, email: data.email, text: data.text, })
    });

});
