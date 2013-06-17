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
    config.imageMagickPath = 'C:\\Program Files (x86)\\ImageMagick-6.8.6-Q16\\convertim.exe';
    config.dbConnection = {
        host: 'localhost',
        user: 'root',
        password: 'root',
        charset: 'utf8',
        database: 'jplay',
        multipleStatements: true
    };
})();