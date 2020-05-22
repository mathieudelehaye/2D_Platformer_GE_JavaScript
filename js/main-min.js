// var screenWidth = 1334; var screenHeight = 750;	// ratio 1.78 to be compatible with iPhone screen  
var screenWidth = 1068; var screenHeight = 600;	// ratio 1.78 to be compatible with iPhone screen  
// var screenWidth = 854; var screenHeight = 480;	// ratio 1.78 	
// var screenWidth = 770; var screenHeight = 595;	// 22 x 17 tiles  
var scaleFactor = 1.5; 
var gfxItems = { playerSprite: null, enemies: null, goalSprite: null }; 
var groups = {};  
var mayJump = false; 
var level_file = "assets/level_map.json"; 
var map; 
var scrollScreen = 0;	// 0: no scroll, 1: scroll screen to right, 2: scroll screen to left 
var cursors;
var score; var scoreText; var scoreTextSize; 
var gameOverText; 
var movSpeed = 3.2;
var layers = {};
var enableSound = false; var jumpSound; var goalSound; var deathSound; var gameOverSound; 
var debugCollision = false;	// display hitboxes  
// Game main state
var mainState = {  
	preload : function() {
		game.load.spritesheet('player', 'assets/sprite.png', 83, 132);
		game.load.spritesheet('slime', 'assets/slime.png', 40, 22);
		game.load.image('map_tiles', 'assets/tiles_spritesheet.png');
		game.load.tilemap('level_tilemap', level_file, null, Phaser.Tilemap.TILED_JSON);
		game.load.image('goal', 'assets/goal.png');
		game.load.audio('jump', 'assets/jump.mp3');
		game.load.audio('goal', 'assets/cashin.mp3');
		game.load.audio('death', 'assets/death.mp3');
		game.load.audio('gameOver', 'assets/gameover.mp3'); 
	},  
	create : function() {
		game.physics.startSystem(Phaser.Physics.ARCADE);	//  We're going to be using physics, so enable the Arcade Physics system
		game.physics.arcade.gravity.y = 1000 * scaleFactor;	// !!! do not apply scale factor to gravity or collisions with bottom platforms will fail. 
    	// create and display tilemap
    	map = game.add.tilemap('level_tilemap');
    	map.addTilesetImage(map.tilesets[0].name, 'map_tiles');
    	map.layers.forEach(function (layer) {	
    		layers[layer.name] = map.createLayer(layer.name);
    		layers[layer.name].setScale(scaleFactor, scaleFactor);	// use .setScale() and not .scale.setTo().  Otherwise, a scaleFactor different than 1 won't allow correct collision detection.   
	        if (layer.properties.collision) {	// collision layer
	        	// console.log("mainState.create: collision layer detected.");
	        	var collision_tiles = [];
	            layer.data.forEach(function (data_row) {	// find tiles used in the layer
    				// console.log("mainState.create: 1 data_row counted"); 
	                data_row.forEach(function (tile) {	// check if it's a valid tile index and isn't already in the list
	   					// console.log("mainState.create: 1 tile counted, tile.index = "+tile.index); 
	   					if (tile.index > 0 && collision_tiles.indexOf(tile.index) === -1) {
	   						collision_tiles.push(tile.index);
	   						map.setTileIndexCallback(tile.index, mainState.spriteTileCB, this);
	   						// console.log("mainState.create: tile.index = "+tile.index); 
	   					}
	   					if (debugCollision) {
	   						tile.debug = true;	// display collision layer tile hitboxes
	   					}
	   				});
	            });
	            // console.log(collision_tiles); 
	            map.setCollision(collision_tiles, true, layer.name);
	            // if (debugCollision) {
	            // 	layer.debug = true;	// display collision layer hitboxes  
	            // }
	        }
	    });
	    //  The score 
	    score = 0; scoreTextSize = 32; scoreText = game.add.text(0, 0, 'score: '+score, { fontSize: scoreTextSize+'px', fill: '#FFF' });
	    // create groups 
	    groups['enemies'] = game.add.group(); 
	    // parse object layers from tilemap 
	    var tmh = new TilemapHelper(map, scaleFactor);
	    gfxItems.enemies = []; 
	    tmh.loadObjects(gfxItems, groups);
	    // resize the world to be the size of the current tile map layer
	    layers[map.layer.name].resizeWorld();
	    //  Our controls.
	    cursors = game.input.keyboard.createCursorKeys();	
	    // Sounds
	    jumpSound = game.add.audio('jump', 0.1);
	    goalSound = game.add.audio('goal', 0.3); 
	    deathSound = game.add.audio('death', 0.3);
	    gameOverSound = game.add.audio('gameOver', 0.3);
	}, 
	spriteTileCB : function (sprite, tile) {
		console.log("spriteTileCB : collision detected"); 
		// return true; 
		return false; 
	}, 
	myCBFunction : function() {
		// console.log("myCBFunction : collision detected"); 
		return true; 
	},  
	hitEnemy : function (player, enemy) {
		// 	console.log("hitEnemy : player hits enemy"); 
		if (enemy.body.touching.up) {	// if the player is above the enemy, the enemy is killed, otherwise game is over. 
		// 		console.log("hitEnemy : enemy is hit from above"); 
			enemy.kill();
			if(enableSound) { 
				deathSound.play();
			}
			player.body.velocity.y = -135;	
			score += 10;	
		} else { 
			if(enableSound) {
				gameOverSound.play(); 
			}
			game.state.start('end'); 
		}
	},    
	reachGoal : function (player, goal) {
		console.log("reachGoal : player hits the goal"); 
		goal.kill();
		if(enableSound) {
			goalSound.play();
		}
		game.state.start('end'); 
	},  
	update : function() {
		// Check collisions 
		// console.log(gfxItems.playerSprite.body.velocity); 
		if(gfxItems.playerSprite.body.velocity.y > 900) {
			gfxItems.playerSprite.body.velocity.y = 900; 
		}
		// game.physics.arcade.collide(gfxItems.playerSprite, layers['collision']);
		game.physics.arcade.collide(gfxItems.playerSprite, layers['collision'], mainState.myCBFunction);
		game.physics.arcade.collide(groups['enemies'], layers['collision']);	
		game.physics.arcade.overlap(gfxItems.playerSprite, groups['enemies'], mainState.hitEnemy);
		game.physics.arcade.overlap(gfxItems.playerSprite, gfxItems.goalSprite, mainState.reachGoal);
		game.physics.arcade.collide(gfxItems.goalSprite, layers.collision);
		// Display hitboxes 
		if (debugCollision) {
			game.debug.body(gfxItems.playerSprite);	// display player hitbox
			Object.keys(gfxItems.enemies).forEach( function(key) {
	    		game.debug.body(gfxItems.enemies[key].sprite);	// display enemy hitbox 
	    	}); 
			game.debug.body(gfxItems.goalSprite);	// display goal hitbox
		}
		// Set camera 
		game.camera.x = gfxItems.playerSprite.body.x - screenWidth / 2; 
		game.camera.y = gfxItems.playerSprite.body.y - screenHeight / 5;
		// Update and move score
		scoreText.text = 'score: '+score;
	    scoreText.x = game.camera.x + screenWidth - scoreTextSize/2*(scoreText.text.length+1);	// char width = scoreTextSize / 2
	    scoreText.y = game.camera.y + scoreTextSize/1.5;	// char height = scoreTextSize / 1.5
		// Update player position 
		if(gfxItems.playerSprite.body.blocked.down && cursors.up.isUp) { 
			mayJump = true;	// Must release up button while blocked down ground so that mayJump becomes true 
		}
		if (cursors.right.isDown || (game.input.activePointer.isDown && game.input.activePointer.x > screenWidth / 2)) {	// Right arrow has been pressed. 
			if(gfxItems.playerSprite.body.x >= screenWidth / 2) { 
				scrollScreen = 1;	// must scroll screen right
			}
			if(scrollScreen==1) { 
				game.camera.x = gfxItems.playerSprite.body.x - screenWidth / 2 + movSpeed;
			}
			gfxItems.playerSprite.body.velocity.x = 200 * scaleFactor;	// !!! beware replacing setting body.vecolicty.x by incrementing body.x will cause problems with platform side collisions !!! 
			gfxItems.playerSprite.animations.play('walk');
			gfxItems.playerSprite.scale.setTo(scaleFactor, scaleFactor);
		} else if(cursors.left.isDown || (game.input.activePointer.isDown && game.input.activePointer.x < screenWidth / 2)) {	// Left arrow has been pressed. 
			if(gfxItems.playerSprite.body.x - game.camera.x <= screenWidth / 2) {
		    	scrollScreen = 2;	// must scroll screen left 
		    }
		    if(scrollScreen==2) { 
		    	game.camera.x = gfxItems.playerSprite.body.x - screenWidth / 2 - movSpeed;
		    }
			gfxItems.playerSprite.body.velocity.x = -200 * scaleFactor;	// !!! beware replacing setting body.vecolicty.x by incrementing body.x will cause problems with platform side collisions !!! 
			gfxItems.playerSprite.animations.play('walk');
			gfxItems.playerSprite.scale.setTo(-scaleFactor, scaleFactor);
		} else {	// Stand still. 
			gfxItems.playerSprite.body.velocity.x = 0;
			gfxItems.playerSprite.animations.stop();
			gfxItems.playerSprite.frame = 0;
		}
		if ((cursors.up.isDown||(game.input.activePointer.msSinceLastClick ﻿< game.input.doubleTapRate))&&mayJump) {	// Up arrow or virtua button has been pressed && mayJump is true 
			mayJump = false; 
			game.input.activePointer.msSinceLastClick = 1000 ; 
			gfxItems.playerSprite.body.velocity.y = -500 * scaleFactor;	
			if(enableSound) { 
				jumpSound.play();
			}
		}
		// Update enemy position 
		Object.keys(gfxItems.enemies).forEach( function(key) {
			var enemy = gfxItems.enemies[key]; 
			if(Math.abs(enemy.sprite.body.x - enemy.initialX) >= enemy.maxDist) { 
				enemy.dir *= -1; 
				enemy.initialX = enemy.sprite.body.x; 
			} 
			enemy.sprite.body.velocity.x = enemy.dir*enemy.speed; 
			enemy.sprite.scale.x = -enemy.dir * scaleFactor; 
		}); 
	}
} 
// Game over state
var endState = {  
	preload: function() {},
	create: function() {  
        // console.log("endState.create: end of game"); 
        map.destroy();
        gfxItems.playerSprite.destroy();	
        scoreText.destroy(); 
		game.stage.backgroundColor = '#000000';	// Set the background color to black
		restartKey = game.input.keyboard.addKey(Phaser.Keyboard.R); 
    	var text = 'Game Over (score: ' + score+').  "R" or tap to restart';	//  The game over message 
    	var fs = 20; 
    	gameOverText = game.add.text((game.width/2 - text.length/2*fs / 2), game.height/2 - fs, text, { fontSize: fs, fill: '#FFF' });
    },
    update: function() {  
		if (restartKey.isDown || game.input.activePointer.isDown) {	// Restart game if key is pressed
			score = 0;
			gameOverSound.stop();
			game.state.start('main');
		}
	}
}
// Initialize the game and start our state
var game = new Phaser.Game(screenWidth, screenHeight, Phaser.AUTO, 'phaser-example'); 	
game.state.add('main', mainState);  
game.state.add('end', endState);  
game.state.start('main');