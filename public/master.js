/*
 * Faye Chat client adapted from Soapbox by James Coglan
 * (https://github.com/jcoglan/faye/tree/master/examples)
 */
Master = {
    /**
     * Initializes the application, passing in the globally shared Bayeux
     * client. Apps on the same page should share a Bayeux client so
     * that they may share an open HTTP connection with the server.
     */
    init: function(client, id, questions) {
        var self = this;
        
        self._client = client;
        self._questions = questions;
        self._number = 0;
        self._question = true;
        self._quizId = id;
    
        self._post    = $('#postMessage');
        self._players = $('#players');
    		self._playing = $('#playing');
				self._nextp = $('#nextp');
				self._page = $('#one');
        self.launch();
    },
    
		getProfilePic: function(sName, udata) {
			var self = this;
      $.ajax({
          type: 'GET',
          url: '/twitter?screenname=' + sName,
          dataType: 'text',
          success: function(data) {
              console.log("/twitter RESULT: " + data);
							self._playing.append('<li class="ui-li ui-li-static ui-body-c ui-li-has-thumb">' +
								'<img id="' + sName + '" height="78px" src="' + data + '" class="ui-li-thumb glossy iradius50" /><h3>' + sName + "</h3></li>");							
          },
          error: function(jqXHR, textStatus) {
							console.log("ERROR: " + textStatus);
							self._playing.append('<li class="ui-li ui-li-static ui-body-c ui-li-has-thumb">' +
								'<img height="78px" src="/bug_blue_3d_rgb.png" class="ui-li-thumb glossy iradius50" /><h3>' + sName + "</h3></li>");							
          }
      });
		},
		
    getQ: function(number) {
				var self = this;
				if (number == 0) {
					$('#prompt').addClass("rollin");					
				} else {
					$('#prompt').removeClass('rollin');
					$('#prompt').addClass('hinge');
					setTimeout(function() {
						$('#prompt').removeClass('hinge');
						$('#prompt').html('<p>' + self._questions[number].Question__r.Question__c +
			            '</p><p></p>');
						$('#prompt').addClass('rollin');
            self._client.publish('/quiz', {type: 'next', question: self._questions[self._number].Question__r.Question__c });
						
					}, 1200);
				}
       return '<p>' + self._questions[number].Question__r.Question__c +
            '</p><p></p>';
    },
  
    getQnA: function(number) {
        var self = this;
        return '<p>' + self._questions[number].Question__r.Question__c +
            '</p><p>A: ' + self._questions[number].Question__r.Answer__c + "</p>";
						
    },
    
    nextQuestion: function() {
        var self = this;
    
        // Reset clients, increment Q number, show next question etc
        self._number++;
        self._players.empty();
				self._players.append("<li data-role='list-divider'>Buzzed In</li>")
        if (self._number < self._questions.length) {
						self.getQ(self._number);
						//$('#prompt').html(self.getQ(self._number));
            self._question = true;                    
        } else {
            $('#prompt').html('Results');
            $('#next').remove();
            // Send user record to db
            $.ajax({
                type: 'GET',
                url: '/highscores',
                dataType: 'json',
                data: { 
                    Quiz__c: self._quizId
                },
                success: function(data) {
                    console.log(data);
                    $.each(data.records, function(index, value) { 
                        self._players.append('<p>'+
                            html.escapeAttrib(value.Name)+' '+
                            value.Score__c+'</p>');                                    
                    });
                },
                error: function(jqXHR, textStatus) {
                    alert('Error getting high scores');
                }
            });                                            
        }        
    },
  
    /**
     * Starts the application after a username has been entered. A
     * subscription is made to receive all messages on the channel,
     * and a form is set up to send messages.
     */
    launch: function() {
        var self = this;
    
        // Subscribe to the chat channels
        var subscription = self._client.subscribe('/quiz', self.accept, self);
        
        // Show first question
        $('#prompt').html(self.getQ(self._number));
  
        subscription.callback(function() {
            self._post.submit(function() {
                if (self._number < self._questions.length) {
                    if (self._question) {
                        // Just show question & answer and toggle _question flag
                        $('#prompt').html(self.getQnA(self._number));
												self._page.attr("id", "two");
												self._page.attr("data-url", "two");
												//alert(self.getQnA(self._number));
                        self._question = false;
												self._nextp.attr("href", "#two");
                    } else {
                        // Increment the score for the appropriate player
                        var player = $("input[@name='player']:checked").val();
                        if (player) {
                            // Increment player score
														console.log("playername=" + player);
														console.log("quizid=" + self._quizId);
                            $.ajax({
                                type: 'POST',
                                url: '/incscore',
                                data: { 
                                    Name: player,
                                    Quiz__c: self._quizId
                                },
                                success: function(data) {
                                    self.nextQuestion();                                    
                                },
                                error: function(jqXHR, textStatus) {
                                    alert('Error incrementing score for '+player);
                                }
                            });                
                        } else {
                            self.nextQuestion();
                        }
                    }                    
                }
                return false;
            });
        });
    
        subscription.errback(function(error) {
            alert("Error subscribing: " + error.message);
        });
    },
  
    /**
     * Handler for received messages.
     */
    accept: function(message) {
        var self = this;
        
        if (message.type === 'buzz') {
					var now = new Date();
          self._players.append('<li class="ui-li ui-li-static ui-body-c"><div>' +
							'<img src="' + $('#' + message.user).attr('src') + '" height="40px" /><input type="radio" name="player" value="'+
              html.escapeAttrib(message.user)+'"/>' + html.escapeAttrib(message.user) + ' (' + formatTime(now) + ')</div></li>');
        } else if (message.type === 'user') {
            // Send user record to db
            $.ajax({
                type: 'POST',
                url: '/player',
                data: { 
                    Name: message.handle,
                    Name__c: message.name,
                    Quiz__c: self._quizId
                },
                success: function(data) {
                    self._client.publish('/quiz', {
                        handle: message.handle, 
                        type: 'userok',
                        ok: true,
												question: self._questions[self._number].Question__r.Question__c
                    });
										self.getProfilePic(message.handle, { Name: message.handle, Name__c: message.name, Quiz__c: self._quizId });
										//self._playing.append('<li class="ui-li ui-li-static ui-body-c ui-li-has-thumb">' +
										//	'<image src="" class="ui-li-thumb" /><h3>' + message.handle + "</h3></li>");
                },
                error: function(jqXHR, textStatus) {
                    self._client.publish('/quiz', {
                        handle: message.handle, 
                        type: 'userok',
                        ok: false,
                        error: 'Error - try another handle'
                    });                    
                }
            });                
        }
    }
};
