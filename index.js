const firebase = require('firebase');
const UserModel = firebase.auth();
const DB = firebase.firestore();

const app = Sammy('#container', function () {
    this.use('Handlebars', 'hbs');

    this.get('#/home', function (context) {
        DB.collection('movies')
        .get()
        .then((response) => {
            context.movies = response.docs.map((movie) => {
                 return { id: movie.id, ...movie.data() } 
                });
            extendContext(context)
            .then(function () {
                this.partial('./templates/home.hbs');
            })
        })
        .catch(e => console.log(e));
        
    });
    this.get('/login', function (context) {
        extendContext(context)
            .then(function () {
                this.partial('./templates/login.hbs');
            });
    });
    this.get('/register', function (context) {
        extendContext(context)
            .then(function () {
                this.partial('./templates/register.hbs');
            });
    });
    this.get('/logout', function (context) {
        UserModel.signOut()
            .then(response => {
                clearUserData();
                this.redirect('#/home');
            })
    });
    this.get('/add-movie', function (context) {
        extendContext(context)
            .then(function () {
                this.partial('./templates/addMovie.hbs');
            });
    });

    this.get('/comment/:movieId', function (context) {
        const { movieId } = context.params;

        DB.collection('movies').doc(movieId).get()
            .then((response) => {
                const actualMovieData = { ...response.data() };
                const currentComment = document.getElementById('commentHere').value;
                const username = getUserData().email.substring(0, getUserData().email.lastIndexOf('@'));
                const number = actualMovieData.comments.length + 1;

                actualMovieData.comments.push({
                    'number': number,
                    'name': username,
                    'comment': currentComment
                });
                return DB.collection('movies').doc(movieId).set(actualMovieData);
            })
            .then(() => {
                this.redirect(`#/details/${movieId}`);
            })
    })

    this.get('/details/:movieId', function (context) {
        const { movieId } = context.params;

        DB.collection('movies').doc(movieId).get()
            .then((response) => {
                const { uid } = getUserData();
                console.log(uid);
                const actualMovieData = response.data();
                const imTheSalesMan = actualMovieData.salesman === getUserData().uid;
                const userIndex = actualMovieData.likes.indexOf(getUserData().uid);


                const likes =  actualMovieData.likes.length;

                const imInTheClientsList = userIndex > -1;

                context.movie = { ...actualMovieData, imTheSalesMan, id: movieId, imInTheClientsList, likes };
                console.log(context.movie);
                extendContext(context)
                    .then(function () {
                        this.partial('./templates/details.hbs');
                    })
            })
    });
    this.get('/like/:movieId', function (context) {
        const { movieId } = context.params;
        const { uid } = getUserData();

        DB.collection('movies')
            .doc(movieId)
            .get()
            .then((response) => {
                const movieData = { ...response.data() };
                movieData.clients.push(uid);
                

                return DB.collection('movies')
                    .doc(movieId)
                    .set(movieData)
            })
            .then(() => {
                this.redirect(`/details/${movieId}`);
            })
            .catch(e => console.log(e));
    })
    this.get('/delete/:movieId', function (context) {
        const { movieId } = context.params;

        DB.collection('movies').doc(movieId).delete()
            .then(() => {
                this.redirect('/home');
            })
            .catch(e => console.log(e));
    });
    this.get('/edit/:movieId', function (context) {
        const { movieId } = context.params;

        DB.collection('movies')
        .doc(movieId)
        .get()
        .then((response) => {
            context.movie = { id: movieId, ...response.data() };

            extendContext(context)
                .then(function () {
                    this.partial('./templates/editMovie.hbs');
                });
        })
        .catch(e => console.log(e));
    });

    this.post('/register', function (context) {
        const { email, password, repeatPassword } = context.params;

        if (password !== repeatPassword) {
            return;
        }

        UserModel.createUserWithEmailAndPassword(email, password)
            .then((userData) => {
                this.redirect('#/login');
            })
            .catch(e => console.log(e));
    })
    this.post('/login', function (context) {
        const { email, password } = context.params;
        
        UserModel.signInWithEmailAndPassword(email, password)
            .then((userData) => {
                saveUserData(userData);
                this.redirect('#/home');
            })
    })
    this.post('/add-movie', function (context) {
        const { title, description, imageUrl } = context.params;

        DB.collection('movies').add({
            title,
            description,
            imageUrl,
            salesman: getUserData().uid,
            comments: [],
            likes: [],
        })
            .then((createdProduct) => {
                this.redirect('#/home');
            })
            .catch(e => console.log(e));
    })
    this.post('/edit/:movieId', function (context) {
        const { movieId, title, description, imageUrl } = context.params;

        DB.collection('movies')
            .doc(movieId)
            .get()
            .then((response) => {
                return DB.collection('movies').doc(movieId).set({
                    ...response.data(),
                    title,
                    description,
                    imageUrl
                })
            })
            .then((response) => {
                this.redirect(`/details/${movieId}`);
            })
            .catch(e => console.log(e));
    });



});
(() => {
    app.run('#/home');
})();

function extendContext(context) {

    const user = getUserData();
    context.isLoggedIn = Boolean(user);
    context.userEmail = user ? user.email : '';

    return context.loadPartials({
        'header': './partials/header.hbs',
        'footer': './partials/footer.hbs'
    });
}

function getUserData() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function saveUserData(data) {
    const { user: { email, uid } } = data;
    localStorage.setItem('user', JSON.stringify({ email, uid }));
}

function clearUserData(data) {
    this.localStorage.removeItem('user');
}