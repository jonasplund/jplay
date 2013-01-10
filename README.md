jplay
========
A client/server for streaming mp3  

Setup:  
Install a mysql server  
Install node.js  
Extract jplay to a directory of your choice  
Uncomment the line db.build(); in jplay_main.js  
Comment the line db.update(); in jplay_main.js  
Set the correct path for options.musicDir in db_connector.js  
Run "node.exe jplay_main.js"  
Comment the line db.build() in jplay_main.js  
Uncomment the line db.update() in jplay_main.js  
Wait for the server to report "Database complete!"  
The server should now be running at localhost:8088  
