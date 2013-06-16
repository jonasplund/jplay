(function () {
    'use strict';
    var config = module.exports = {};

    config.musicDir = 'E:\\Musik';
    config.baseDirId = 1;
    config.musicExtensions = [
        { extension: '', contentType: '' },
        { extension: '.mp3', contentType: 'audio/mpeg' },
        { extension: '.ogg', contentType: 'audio/ogg' },
        { extension: '.oga', contentType: 'audio/ogg' }
    ];
    config.pictureExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
    config.defaultAlbumCover = './public/img/album_unknown.jpg';
    config.dbConnection = {
        host: 'localhost',
        user: 'root',
        password: 'root',
        charset: 'utf8',
        database: 'jplay',
        multipleStatements: true
    };
})();