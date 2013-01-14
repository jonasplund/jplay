jplay
========
A client/server for streaming mp3  

Setup:  
Install a mysql server  
Install node.js  
Extract jplay to a directory of your choice  
Set correct info in config.default.js and rename it to config.js    
Run "node jplay_main.js build" the first time you run it 
Wait for the server to report "Database complete!"  
The server should now be running at localhost on port 8088 by default  
When you've added/removed/changed your mp3s, run "node jplay_main.js update"
Regular run mode is "node jplay_main.js"