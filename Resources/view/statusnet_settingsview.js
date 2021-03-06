/**
 * StatusNet Mobile
 *
 * Copyright 2010 StatusNet, Inc.
 * Based in part on Tweetanium
 * Copyright 2008-2009 Kevin Whinnery and Appcelerator, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

StatusNet.SettingsView = function(client) {

    var db = StatusNet.getDB();
    this.accounts = [];
    this.workAcct = null;
    this.updateTimeout = null;
    this.lastUsername = '';
    this.lastPassword = '';
    this.lastSite = '';
    this.client = client;
    this.rows = [];
    this.nickname = null ;
    this.onClose = new StatusNet.Event();
    this.rwindow = null;
    this.lwindow = null;
    this.nickname = null;
    this.authorID = null;
    this.username = null;
};

/**
 * Initialize the account settings view...
 * Creates a table view listing all configured accounts.
 */
StatusNet.SettingsView.prototype.init = function() {
    StatusNet.debug('SettingsView.init');
    var view = this;
    this.showingLongclickDialog = false;
    this.accounts = StatusNet.Account.listAll(StatusNet.getDB());
    if(this.accounts != null && this.accounts.length > 0){
    	for(var i = 1; i < this.accounts.length; i++){
    		this.accounts[i].deleteAccount();
    	}
    	StatusNet.debug('SettingsView.init... this.accounts[0].nickname: '+this.accounts[0].nickname+"username: "+this.accounts[0].username);
    	view.client.switchAccount(this.accounts[0]);
    }else{
			view.showAddAccount(true);
		}
};

/**
 * Open the add-new-account modal dialog
 */
StatusNet.SettingsView.prototype.showRegister = function(noCancel) {
    var view = this;
    var window = this.rwindow = Titanium.UI.createWindow({
        title: "企业微博",
        backgroundColor: StatusNet.Platform.dialogBackground(),
        navBarHidden: true // hack for iphone for now
    });

    var doClose = function() {

        // Hide keyboard...
        for (var i in view.fields) {
            if (view.fields.hasOwnProperty(i)) {
                var field = view.fields[i];
                if (typeof field.blur == 'function') {
                    field.blur();
                }
            }
        }

        //view.fields = null;
        StatusNet.Platform.animatedClose(window);
    };

    // @fixme drop the duped title if we can figure out why it doesn't come through
    var navbar = StatusNet.Platform.createNavBar(window, '碰碰头');

    var cancel = Titanium.UI.createButton({
        title: "返回"
    });
    cancel.addEventListener('click', function() {
        doClose();
    });
    
    // Check for empty fields. Sending an empty field into
    // verifyAccount causes Android to crash
    var checkForEmptyFields = function(onSuccess, onFail) {
        StatusNet.debug("Checking for empty fields in add account");
        //var site = view.fields.site.value;
        var site = 'a.pengpengtou.com'
        var username = view.rfields.username.value;
        var password = view.rfields.password.value;
        var verifyPassword = view.rfields.verifyPassword.value;
        var verifyCode = view.rfields.verifyCode.value;

        var bad = [];
        if (!site) {
            bad.push("Server");
        }
        if (!username) {
            bad.push('用户名');
        }
        if (!password) {
            bad.push("密码");
        }
        if (!verifyPassword) {
            bad.push("密码重复");
        }
        if (!verifyCode) {
            bad.push("验证码");
        }

        var verb = "is";

        if (bad.length > 1) {
            verb = "are";
        }

        if (bad.length == 0) {
            if(/^1\d{10}$/.test(username)) {
                onSuccess();
            } else {
                var msg = "您输入的手机号不正确，请您再次输入！";
                onFail(msg);
            }
        } else {
            var msg = bad.join('，') + "必须输入！";
            onFail(msg);
        }
    };

    if (!noCancel) {
        navbar.setLeftNavButton(cancel);
    }

    var workArea = Titanium.UI.createView({
        top: navbar.height,
        left: 0,
        right: 0,
        bottom: 0,
        layout: 'vertical'
    });
    
    var scrollView = Titanium.UI.createScrollView({
        width: '100%',
        height: Titanium.Platform.displayCaps.platformHeight - navbar.height
    });
    
    scrollView.add(workArea);
    
    window.add(scrollView);
    
    var register = Titanium.UI.createButton({
   		title: "注册",
   		height:40,
   		left:25,
   		right:25,
   		top:5,
   		color:'green'
    });

    register.addEventListener('click', function() {
        view.register(view);
    });
    
    var pasVerify = Titanium.UI.createButton({
   		title: "获取验证码",
   		height:40,
   		left:25,
   		right:25,
   		top:5,
   		color:'red'
    });
    
    pasVerify.addEventListener('click', function() {
        StatusNet.debug('clicked pasVerify');
        view.getVerifyCode();
    });
    
    this.disableFields = function() {
    	StatusNet.debug("disable all fields");
    	view.rfields.username.enabled = false ;
    	view.rfields.password.enabled = false ;
    	view.rfields.verifyPassword.enabled = false ;
    	view.rfields.verifyCode.enabled = false ;
    	register.enabled = false ;
    	pasVerify.enabled = false ;
    	cancel.enabled = false ;
    }
    
    this.enableFields = function() {
    	StatusNet.debug("enable all fields");
    	view.rfields.username.enabled = true ;
    	view.rfields.password.enabled = true ;
    	view.rfields.verifyPassword.enabled = true ;
    	view.rfields.verifyCode.enabled = true ;
    	register.enabled = true ;
    	pasVerify.enabled = true ;
    	cancel.enabled = true ;
    }

    this.rfields = {};
    var commonProps = {
        left: 25,
        right: 25,
        height: StatusNet.Platform.isAndroid() ? 'auto' : 32, // argghhhhh auto doesn't work on iphone
        borderStyle: Titanium.UI.INPUT_BORDERSTYLE_ROUNDED,
        autocapitalization: Titanium.UI.TEXT_AUTOCAPITALIZATION_NONE,
        autocorrect: false
    };
    
    var rfields = {
        username: {
            label: "手机号",
            props: {
            		hintText: "手机号",
            		keyboardType: Titanium.UI.KEYBOARD_EMAIL,
                returnKeyType: Titanium.UI.RETURNKEY_DONE
            }
        },
        password: {
            label: "密码",
           	props: {
           			hintText: "密码",
                passwordMask:true,
                keyboardType: Titanium.UI.KEYBOARD_EMAIL, // we need to specify *this* or the autocorrect setting doesn't get set on the actual field for Android?!
                returnKeyType:Titanium.UI.RETURNKEY_DONE
            }
        },
        verifyPassword: {
            label: "确认密码",
            props: {
            		hintText: "确认密码",
                passwordMask:true,
                keyboardType: Titanium.UI.KEYBOARD_EMAIL, // we need to specify *this* or the autocorrect setting doesn't get set on the actual field for Android?!
                returnKeyType:Titanium.UI.RETURNKEY_DONE
            }
        },
        verifyCode: {
            label: "验证码",
            props: {
            		hintText: "验证码",
                keyboardType: Titanium.UI.KEYBOARD_EMAIL, // we need to specify *this* or the autocorrect setting doesn't get set on the actual field for Android?!
                returnKeyType:Titanium.UI.RETURNKEY_DONE
            }
        }
    };
    for (var i in rfields) {
        if (rfields.hasOwnProperty(i)) {
            var field = rfields[i];
            var props = {};
            var slurp = function(source) {
                for (var j in source) {
                    if (source.hasOwnProperty(j)) {
                        props[j] = source[j];
                    }
                }
            };
            slurp(commonProps);
            slurp(field.props);

            var label = Titanium.UI.createLabel({
                left: 25,
                right: 8,
                height: 'auto',
                text: field.label
            });

            var text = Titanium.UI.createTextField(props);            

         		//workArea.add(label);
         		workArea.add(text);
            
            if(field.label == "手机号"){
            	workArea.add(pasVerify) ;
            }

            this.rfields[i] = text;
        }
    }
    
    /*
    this.fields.username.addEventListener('return', function() {
        view.fields.password.focus();
    });
    this.rfields.password.addEventListener('return', function() {
        view.fields.verifyPassword.focus();
    });
    this.rfields.verifyPassword.addEventListener('return', function() {
        view.fields.verifyCode.focus();
    });
    this.rfields.verifyCode.addEventListener('return', function() {
        register.fireEvent('click', {});
    });
    */
   
  	this.rfields.verifyPassword.addEventListener('focus', function() {
    	scrollView.scrollTo(0, 40);
		});
   
   	this.rfields.verifyCode.addEventListener('focus', function() {
   		scrollView.scrollTo(0, 80);
  	});

    this.rfields.status = Titanium.UI.createLabel({
        text: "",
        left: 25,
        right: 25,
        height: StatusNet.Platform.isAndroid() ? 'auto' : 32
    });
    
    workArea.add(this.rfields.status);
    
    /*
    var login = Titanium.UI.createButton({
   		title: "登陆",
   		height:40,
   		left:25,
   		right:25,
   		top:5,
   		color:'blue'
    });

    login.addEventListener('click', function() {
        view.showAddAccount(true);
    });
    */
    
    //workArea.add(login) ;
    //workArea.add(pasVerify) ;
    workArea.add(register) ;

    StatusNet.Platform.animatedOpen(window);
};

/**
 * Open the add-new-account modal dialog
 */
StatusNet.SettingsView.prototype.showAddAccount = function(noCancel) {
	
    var view = this;
    var window = this.lwindow = Titanium.UI.createWindow({
        title: "企业微博",
        backgroundColor: StatusNet.Platform.dialogBackground(),
        navBarHidden: true // hack for iphone for now
    });

    var doClose = function() {

        // Hide keyboard...
        for (var i in view.rfields) {
            if (view.rfields.hasOwnProperty(i)) {
                var field = view.rfields[i];
                if (typeof field.blur == 'function') {
                    field.blur();
                }
            }
        }

        view.rfields = null;
        StatusNet.Platform.animatedClose(window);
    };

    // @fixme drop the duped title if we can figure out why it doesn't come through
    var navbar = StatusNet.Platform.createNavBar(window, '碰碰头');

    var cancel = Titanium.UI.createButton({
        title: "返回"
    });
    cancel.addEventListener('click', function() {
        doClose();
    });
    
    // Check for empty fields. Sending an empty field into
    // verifyAccount causes Android to crash
    var disableFields = function() {
    	StatusNet.debug("disable all fields");
    	view.fields.username.enabled = false ;
    	view.fields.password.enabled = false ;
    }
    
    var enableFields = function() {
    	StatusNet.debug("enable all fields");
    	view.fields.username.enabled = true ;
    	view.fields.password.enabled = true ;
    }
    
    var checkForEmptyFields = function(onSuccess, onFail) {
        StatusNet.debug("Checking for empty fields in add account");
        //var site = view.fields.site.value;
        var site = 'a.pengpengtou.com'
        StatusNet.debug("####ppt view.fields:" + JSON.stringify(view.fields));
        var username = view.fields.username.value;
        var password = view.fields.password.value;

        var bad = [];
        if (!site) {
            bad.push("Server");
        }
        if (!username) {
            bad.push('用户名');
        }
        if (!password) {
            bad.push("密码");
        }

        var verb = "is";

        if (bad.length > 1) {
            verb = "are";
        }

        if (bad.length == 0) {
            if(username == 'user1') {
                StatusNet.debug("username is user1,continue...");
                onSuccess();
            } else if(/^1\d{10}$/.test(username)) {
                onSuccess();
            } else {
                var msg = "您输入的手机号不正确，请您再次输入！";
                onFail(msg);
            }
        } else {
            var msg = bad.join(', ') + "必须输入！";
            onFail(msg);
        }
    };

    if (!noCancel) {
        navbar.setLeftNavButton(cancel);
    }
    
    var workArea = Titanium.UI.createView({
        top: navbar.height,
        left: 0,
        right: 0,
        bottom: 0,
        layout: 'vertical'
    });
    
    var scrollView = Titanium.UI.createScrollView({
        width: '100%',
        contentHeight: 'auto',
        height: Titanium.Platform.displayCaps.platformHeight - navbar.height,
    });
    
    scrollView.add(workArea);
    
    window.add(scrollView);

    this.fields = {};
    var commonProps = {
        left: 8,
        right: 8,
        height: StatusNet.Platform.isAndroid() ? 'auto' : 32, // argghhhhh auto doesn't work on iphone
        borderStyle: Titanium.UI.INPUT_BORDERSTYLE_ROUNDED,
        autocapitalization: Titanium.UI.TEXT_AUTOCAPITALIZATION_NONE,
        autocorrect: false
    };
    var fields = {
        username: {
            label: "手机号",
            props: {
            		hintText:'手机号', 
                returnKeyType: Titanium.UI.RETURNKEY_DONE,
                keyboardType: Titanium.UI.KEYBOARD_EMAIL
            }
        },
        password: {
            label: "密码",
            props: {
            		hintText: "密码", 
                passwordMask:true,
                keyboardType: Titanium.UI.KEYBOARD_EMAIL, // we need to specify *this* or the autocorrect setting doesn't get set on the actual field for Android?!
                returnKeyType:Titanium.UI.RETURNKEY_DONE
            }
        }
    };
    for (var i in fields) {
        if (fields.hasOwnProperty(i)) {
            var field = fields[i];
            var props = {};
            var slurp = function(source) {
                for (var j in source) {
                    if (source.hasOwnProperty(j)) {
                        props[j] = source[j];
                    }
                }
            };
            slurp(commonProps);
            slurp(field.props);

            var label = Titanium.UI.createLabel({
                left: 8,
                right: 8,
                height: 'auto',
                text: field.label
            });
            //workArea.add(label);

            var text = Titanium.UI.createTextField(props);
            workArea.add(text);

            this.fields[i] = text;
        }
    }
    
    /*
    this.fields.username.addEventListener('return', function() {
        view.fields.password.focus();
    });
    this.fields.password.addEventListener('return', function() {
        login.fireEvent('click', {});
    });
    */
   
   
   	this.fields.password.addEventListener('focus', function() {
   		scrollView.scrollTo(0, 40);  
		});

    this.fields.status = Titanium.UI.createLabel({
        text: "",
        left: 8,
        right: 8,
        height: StatusNet.Platform.isAndroid() ? 'auto' : 32
    });
    
    workArea.add(this.fields.status);

    var login = Titanium.UI.createButton({
   		title: "登陆",
   		height:40,
   		left:25,
   		right:25,
   		color:'blue'
    });

    login.addEventListener('click', function() {
        StatusNet.debug('clicked login');
        login.enabled = false;
        register.enabled = false;
        forget.enabled = false;
        checkForEmptyFields(function() {
        	view.fields.status.text = "开始登陆..." ;
        	disableFields() ;
      		view.checkAccount(view, function(){
      			view.verifyAccount(function() {
              StatusNet.debug('login click: updated');
              if (view.workAcct != null) {
                  // @fixme separate the 'update state' and 'login' actions better
                  view.saveNewAccount();
                  view.client.switchAccount(view.workAcct);
                  doClose();
              }
            },
            function() {
                StatusNet.debug("Could not verify account.");
                login.enabled = true;
                register.enabled = true;
                forget.enabled = true;
                enableFields() ;
            });
    	   	}, function(){
    	   		StatusNet.debug("Could not get nickname.");
          	login.enabled = true;
          	register.enabled = true;
          	forget.enabled = true;
          	enableFields() ;
    	   	});
        },
        function(msg) {
            StatusNet.debug("Some required account fields were empty");
            var errDialog = Titanium.UI.createAlertDialog({
                title: '用户提示',
                message: msg,
                buttonNames: ['确认']
            });
            errDialog.show();
            login.enabled = true;
            register.enabled = true;
            forget.enabled = true;
            enableFields() ;
        });
    });
    
    var register = Titanium.UI.createButton({
   		title: "注册",
   		height:40,
   		left:25,
   		right:25,
   		top:5,
   		color:'green'
    });
    
    register.addEventListener('click', function() {
        StatusNet.debug('clicked register');
        view.showRegister(false);
    });
    
    var forget = Titanium.UI.createButton({
        title: "忘记密码？",
        height:40,
        left:50,
        right:50,
        top:5,
        // color:'green'
    });

    forget.addEventListener('click', function() {
        StatusNet.debug('clicked forget');
        view.showRegister(false);
    });
    
    workArea.add(login);
    workArea.add(register);
    workArea.add(forget);

    StatusNet.Platform.animatedOpen(window);
};

/**
 * Validate input and see if we can make it work yet
 */
StatusNet.SettingsView.prototype.verifyAccount = function(onSuccess, onError) {
    var that = this;
    this.discoverNewAccount(function(acct) {
        StatusNet.debug("Discovered... found: " + acct);

        that.workAcct = acct;
        that.fields.status.text = "开始登陆...";

        acct.apiGet('account/verify_credentials.xml', function(status, xml) {
            that.fields.status.text = "认证通过.";

            that.workAcct.avatar = $(xml).find('user > profile_image_url').text();
            that.workAcct.id = $(xml).find('user > id').text();
            StatusNet.debug("####ppt ... userId: " + that.workAcct.id);

            // get site specific configuration info
            that.workAcct.apiGet('statusnet/config.xml', function(status, xml) {
                that.workAcct.textLimit = $(xml).find('site > textlimit').text();
                that.workAcct.siteLogo = $(xml).find('site > logo').text();

                // finally call our success
                onSuccess();

            }, function(status, msg) {
                that.fields.status.text = "No site config; bad server version?";
                StatusNet.debug("Failed to load site config: HTTP response " +
                    status + ": " + msg);
                onError();
            });

        }, function(status, msg) {
            if (status == 401) {
                // Bad auth
                that.fields.status.text = "错误的用户名或密码！";
            } else {
                that.fields.status.text = "HTTP error " + status;
            }
            StatusNet.debug("We failed to load account info: HTTP response " +
                status + ": " + msg);
            onError();
        });
    }, function() {
        that.fields.status.text = "Could not verify site.";
        StatusNet.debug("Bogus acct");
        that.workAcct = null;
        onError();
        //$("#new-save").attr("disabled", "disabled");
        //$("#new-avatar").attr("src", "images/default-avatar-stream.png");
    });
};

StatusNet.SettingsView.prototype.checkAccount = function(view, onSuccess, onError) {
    var that = this;
    this.discoverPPTAccount(function(status, responseObj, responseText) {
     	StatusNet.debug("####stevenchen status: " + status);
     	//that.fields.username.value = responseObj.nickname ;
     	that.nickname = responseObj.nickname;
     	that.authorID = responseObj.authorID;
     	that.username = responseObj.username;
     	StatusNet.debug("####stevenchen nickname:" + that.nickname+" authorID:"+that.authorID+" username:"+that.username);
     	onSuccess() ;
   	}, function(status, responseObj, responseText) {
   		that.fields.status.text = "错误的用户名或密码.";
     	StatusNet.debug("####stevenchen status: " + status);
    	StatusNet.debug("####stevenchen responseText: " + responseText);
    	onError() ;
  	});
};

/**
 * Build an account object from the info in our form, if possible.
 * We won't yet know for sure whether it's valid, however...
 *
 * @param onSuccess function(StatusNet.Account acct)
 * @param onError function()
 */
StatusNet.SettingsView.prototype.discoverPPTAccount = function(onSuccess, onError) {
	
    var username = $.trim(this.fields.username.value);
    var password = this.fields.password.value;
    var site = 'http://p.pengpengtou.com'

    if (username == '' || password == '' || site == '') {
        onError();
        return;
    }
    
    var url = site + '/api/auth.json' ;

    var params = "username=" + username + "&password=" + password ; 
    
    StatusNet.HttpClientPPT.send(url,onSuccess,onError,params) ;
    
};

/**
 * Build an account object from the info in our form, if possible.
 * We won't yet know for sure whether it's valid, however...
 *
 * @param onSuccess function(StatusNet.Account acct)
 * @param onError function()
 */
StatusNet.SettingsView.prototype.discoverNewAccount = function(onSuccess, onError) {
		StatusNet.debug("####stevenchen discoverNewAccount ");
		StatusNet.debug("####stevenchen discoverNewAccount this.nickname:" + this.nickname);
    var username = $.trim(this.nickname);
    var nickname = $.trim(this.username);
		StatusNet.debug("####stevenchen username:" + nickname);
		StatusNet.debug("####stevenchen nickname:" + username);
    var password = this.fields.password.value;
    var site = 'a.pengpengtou.com' //$.trim(this.fields.site.value);

    if (username == '' || password == '' || site == '') {
        onError();
        return;
    }

    var that = this;
    var url;

    var foundAPI = function(apiroot) {
        that.fields.status.text = "寻找" + apiroot + "...";
        onSuccess(new StatusNet.Account(username, password, apiroot, nickname));
    };

    if (site.substr(0, 7) == 'http://' || site.substr(0, 8) == 'https://') {
        url = site;
        if (url.substr(url.length - 4, 4) == '/api') {
            url = url + '/';
        }
        if (url.substr(url.length - 5, 5) == '/api/') {
            // Looks like we've been given an API base URL... use it!
            onSuccess(new StatusNet.Account(username, password, url));
        } else {
            // Not sure what we've got, so try discovery...
            StatusNet.RSD.discover(url, function(rsd) {
                StatusNet.RSD.discoverTwitterApi(rsd, foundAPI, onError);
            }, onError);
        }
    } else if (site == 'twitter.com') {
        // Special case Twitter...
        // but it probably ain't super great as we do SN-specific stuff!
        url = 'https://twitter.com/';
        onSuccess(new StatusNet.Account(nickname, password, url));
    } else {
        // Looks like a bare hostname. Try its root page as HTTPS and HTTP...
        // Try RSD discovery!
        this.fields.status.text = "寻找服务器...";
        var rsd = 'https://' + site + '/rsd.xml';
        StatusNet.RSD.discoverTwitterApi(rsd, foundAPI, function() {
            that.fields.status.text = "寻找服务器...";
            var rsd = 'http://' + site + '/rsd.xml';
            StatusNet.RSD.discoverTwitterApi(rsd, foundAPI, onError);
        });
    }
};

StatusNet.SettingsView.prototype.saveNewAccount = function() {
    var id = this.workAcct.ensure(StatusNet.getDB());
    this.workAcct.id = id;
    StatusNet.debug("Saved new account with id " + id);
};

StatusNet.SettingsView.prototype.open = function() {
    StatusNet.Platform.animatedOpen(this.window, 'down', this.table);
};

StatusNet.SettingsView.prototype.closeWindow = function() {
    this.onClose.notify();
    StatusNet.Platform.animatedClose(this.window, 'down', this.table);
};

StatusNet.SettingsView.prototype.close = function() {
    // Close down shared state; not needed here atm.
};

StatusNet.SettingsView.prototype.getVerifyCode = function() {
    // Close down shared state; not needed here atm.
    var that = this ;
    var username = $.trim(this.rfields.username.value);
    var site = 'http://p.pengpengtou.com'

    if (username == '') {
        var errDialog = Titanium.UI.createAlertDialog({
            title: '警告',
            message: '您必须输入手机号码！',
            buttonNames: ['确认']
        });
        errDialog.show();
        return ;
    }else if(!(/^1\d{10}$/.test(username))){
        var errDialog = Titanium.UI.createAlertDialog({
            title: '警告',
            message: '您输入的手机号不正确，请您再次输入！',
            buttonNames: ['确认']
        });
        errDialog.show();
        return ;
    }
    
    var url = site + '/api/get_verify_code.json' ;

    var params = "mobile=" + username ; 
    
    StatusNet.HttpClientPPT.send(url,function(status, responseObj, responseText){
    	StatusNet.debug("####ppt get verify code:" + responseObj.verify_code);
    	//that.rfields.status.text = "验证码获取成功！请等待短信。";
    	var errDialog = Titanium.UI.createAlertDialog({
        title: '用户提示',
        message: '验证码已成功发送至' + username + '！',
        buttonNames: ['确认']
      });
      errDialog.show();
    },function(status, responseObj, responseText){
    	StatusNet.debug("####ppt get verify code:" + responseObj.verify_code+" status:"+status);
    	var errDialog = Titanium.UI.createAlertDialog({
            title: '用户提示',
            message: '此帐号已注册，新的验证码已用短信下发！ status: '+status,
            buttonNames: ['确认']
            });
    	if(status==201){
    	 	var errDialog = Titanium.UI.createAlertDialog({
            title: '用户提示',
            message: '此帐号已注册，新的验证码已用短信下发！',
            buttonNames: ['确认']
        });
        errDialog.show();
    	}else{
    	    //that.rfields.status.text = "验证码获取失败！";
    	    var errDialog = Titanium.UI.createAlertDialog({
            title: '用户提示',
            message: '验证码获取失败！',
            buttonNames: ['确认']
        	});
        	errDialog.show();
    	}
    },params) ;
};

StatusNet.SettingsView.prototype.register = function(view) {
    // Close down shared state; not needed here atm.
    
    var username = $.trim(this.rfields.username.value);
    var password = $.trim(this.rfields.password.value);
    var verifyCode = $.trim(this.rfields.verifyCode.value);
    var site = 'http://p.pengpengtou.com'

    if (username == '') {
        var errDialog = Titanium.UI.createAlertDialog({
            title: '警告',
            message: '您必须输入手机号码！',
            buttonNames: ['确认']
        });
        errDialog.show();
        return ;
    }else if(!(/^1\d{10}$/.test(username))){
        var errDialog = Titanium.UI.createAlertDialog({
            title: '警告',
            message: '您输入的手机号不正确，请您再次输入！',
            buttonNames: ['确认']
        });
        errDialog.show();
        return ;
    }
    
    if (password == '') {
        var errDialog = Titanium.UI.createAlertDialog({
            title: '警告',
            message: '您必须输入密码！',
            buttonNames: ['确认']
        });
        errDialog.show();
        return ;
    }
    
    if (verifyCode == '') {
        var errDialog = Titanium.UI.createAlertDialog({
            title: '警告',
            message: '您必须输入验证码！',
            buttonNames: ['确认']
        });
        errDialog.show();
        return ;
    }
    
  	this.disableFields() ;
    
    var url = site + '/api/reg.json' ;

    var params = "mobile=" + username + '&password=' + password + '&pas_verify=' + verifyCode ;
    
    StatusNet.HttpClientPPT.send(url,function(status, responseObj, responseText){
    	StatusNet.debug("####ppt register response:" + responseText);
    	view.nickname = responseObj.nickname ;
    	StatusNet.debug("####ppt register this.nickname:" + view.nickname);
    	view.fields.username.value = view.rfields.username.value ;
    	view.fields.password.value = view.rfields.password.value ;
    	view.verifyAccount(function() {
        StatusNet.debug('login click: updated');
        if (view.workAcct != null) {
            // @fixme separate the 'update state' and 'login' actions better
            view.saveNewAccount();
            view.client.switchAccount(view.workAcct);
            //view.doClose();
            if(view.lwindow != null)
            	StatusNet.Platform.animatedClose(view.lwindow);
          	if(view.rwindow != null)
            	StatusNet.Platform.animatedClose(view.rwindow);
            
        }
        this.enableFields() ;
     	});
    },function(status, responseObj, responseText){
    	StatusNet.debug("####ppt status:" + status);
    	this.enableFields() ;
    },params) ;
};

