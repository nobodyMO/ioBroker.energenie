'use strict';

/*
 * Created with @iobroker/create-adapter v2.1.1
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
const net = require('net');
var obj;
// Load your modules here, e.g.:
// const fs = require("fs");

class Energenie extends utils.Adapter {
    
	


    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: 'energenie',
        });
		
		this.client = new net.Socket();
		this.step=0;
		this.task=null;
		obj=this;		
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('unload', this.onUnload.bind(this));
		this.client.on('data',this.onIncommingData);
		this.client.on('close',this.connectionClose);
		this.client.on('error',this.connectionError);

    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        // Initialize your adapter here

        // The adapters config (in the instance object everything under the attribute "native") is accessible via
        // this.config:
        this.log.info('config ip address: ' + this.config.ipAddress);
        this.log.info('config port: ' + this.config.port);
        this.log.info('config poll interval: ' + this.config.poll);
		this.key=[32,32,32,32,32,32,32,32];
		for (var i= 0; i < this.config.pass.length; i++) {
				this.key[i] = this.config.pass.charCodeAt(i);
		}

        /*
        For every state in the system there has to be also an object of type state
        Here a simple template for a boolean variable named "testVariable"
        Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
        */
        await this.setObjectNotExistsAsync('SOCKET_A', {
            type: 'state',
            common: {
                name: 'Switch state of socket',
                type: 'boolean',
                role: 'state',
                read: true,
                write: true,
            },
            native: {},
        });
        await this.setObjectNotExistsAsync('SOCKET_B', {
            type: 'state',
            common: {
                name: 'Switch state of socket',
                type: 'boolean',
                role: 'state',
                read: true,
                write: true,
            },
            native: {},
        });
        await this.setObjectNotExistsAsync('SOCKET_C', {
            type: 'state',
            common: {
                name: 'Switch state of socket',
                type: 'boolean',
                role: 'state',
                read: true,
                write: true,
            },
            native: {},
        });
        await this.setObjectNotExistsAsync('SOCKET_D', {
            type: 'state',
            common: {
                name: 'Switch state of socket',
                type: 'boolean',
                role: 'state',
                read: true,
                write: true,
            },
            native: {},
        });


        // In order to get state updates, you need to subscribe to them. The following line adds a subscription for our variable we have created above.
		
        this.subscribeStates('*');
 		
        // You can also add a subscription for multiple states. The following line watches all states starting with "lights."
        // this.subscribeStates('lights.*');
        // Or, if you really must, you can also watch all states. Don't do this if you don't need to. Otherwise this will cause a lot of unnecessary load on the system:
        // this.subscribeStates('*');

        /*
            setState examples
            you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
        */
        // the variable testVariable is set to true as command (ack=false)
        //await this.setStateAsync('testVariable', true);

        // same thing, but the value is flagged "ack"
        // ack should be always set to true if the value is received from or acknowledged from the target system
        //await this.setStateAsync('testVariable', { val: true, ack: true });

        // same thing, but the state is deleted after 30s (getState will return null afterwards)
        //await this.setStateAsync('testVariable', { val: true, ack: true, expire: 30 });
		this.setState('info.connection', false,true);			

		if (this.config.ipAddress.length>6 && Number.isInteger(this.config.port)){
			this.interval=setInterval(this.pollStates, this.config.poll || 10000);
		} else {
		}
    }

    pollStates (){
		obj.log.debug('Start polling');
		obj.client.setTimeout(10000, (e) => {client.end();}); // connection timeout is critical because server does't answer on wrong pass or packets

		obj.client.connect(obj.config.port, obj.config.ipAddress, function() {
  		    obj.setState('info.connection', true,true);
			obj.step=0;
			const hexString = "11";
			const rawHex = Buffer.from(hexString, 'hex');
			obj.client.write(rawHex);
		});
	
	}

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            // Here you must clear all timeouts or intervals that may still be active
            // clearTimeout(timeout1);
            // clearTimeout(timeout2);
            // ...
            clearInterval(obj.interval);

            callback();
        } catch (e) {
            callback();
        }
    }


    /**
     * Is called if a subscribed state changes
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    onStateChange(id, state) {
		// first release only supports timer based changes because of the 10sec deadtime of the server after changes
        if (state) {
            // The state was changed
            this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
        } else {
            // The state was deleted
            this.log.debug(`state ${id} deleted`);
        }
    }


    async onIncommingData(data) {
		if (obj.step==0){
			var bytes = []; // char codes
			obj.task=data;
			for (var i = 0; i < data.length; ++i) {
			  var code = data[i];	  
			  bytes = bytes.concat([code]);
			}
			
			let myArray = new Uint16Array(2);
			myArray[0]=(bytes[0] ^ obj.key[2]) *  obj.key[0] ^ (obj.key[6] | obj.key[4] << 8) ^ bytes[2];
			myArray[1]=(bytes[1]^obj.key[3])*obj.key[1] ^ (obj.key[7] | obj.key[5] << 8) ^ bytes[3];
			let arrByte= new Uint8Array(4);
			arrByte[0]=myArray[0]& 0xff;
			arrByte[1]=myArray[0] >> 8;
			arrByte[2]=myArray[1] & 0xff;
			arrByte[3]=myArray[1] >> 8;
			const buffer = Buffer.from(arrByte);
			obj.step=1;
			obj.client.write(buffer);		
		} else if (obj.step==1){
			var state=obj.parseState (data,obj.task,obj.key);
			obj.step=2;
			let newStateA=null;
			let socketA=await obj.getStateAsync('SOCKET_A');
			if (socketA.ack==false){
				if (socketA.val!=state[0]){
					newStateA=socketA.val;
				} else {
					await obj.setStateAsync('SOCKET_A', { val: state[0], ack: true });
				}				
			} else if (socketA.val!=state[0]){
				await obj.setStateAsync('SOCKET_A', { val: state[0], ack: true });					
			}		
			
			let newStateB=null;
			let socketB=await obj.getStateAsync('SOCKET_B');
			if (socketB.ack==false){
				if (socketB.val!=state[1]){
					newStateB=socketB.val;
				} else {
					await obj.setStateAsync('SOCKET_B', { val: state[1], ack: true });
				}				
			} else if (socketB.val!=state[1]){
				await obj.setStateAsync('SOCKET_B', { val: state[1], ack: true });					
			}		

			let newStateC=null;			
			let socketC=await obj.getStateAsync('SOCKET_C');
			if (socketC.ack==false){
				if (socketC.val!=state[2]){
					newStateC=socketC.val;
				} else {
					await obj.setStateAsync('SOCKET_C', { val: state[2], ack: true });
				}				
			} else if (socketC.val!=state[2]){
				await obj.setStateAsync('SOCKET_C', { val: state[2], ack: true });					
			}		
			
			let newStateD=null;
			let socketD=await obj.getStateAsync('SOCKET_D');
			if (socketD.ack==false){
				if (socketD.val!=state[3]){
					newStateD=socketD.val;
				} else {
					await obj.setStateAsync('SOCKET_D', { val: state[3], ack: true });
				}				
			} else if (socketD.val!=state[3]){
				await obj.setStateAsync('SOCKET_D', { val: state[3], ack: true });					
			}		
			
			if (newStateA!=null || newStateB!=null ||newStateC!=null ||newStateD!=null){
				obj.setStates (obj.client,obj.task,obj.key,newStateA,newStateB,newStateC,newStateD);
				obj.step=2;

			} else {
				obj.step=0;
				obj.client.end ();	
			}
			
		} else if (obj.step==2){
			var state=obj.parseState (data,obj.task,obj.key);
			let socketA=await obj.getStateAsync('SOCKET_A');
			if (socketA.ack==false){
				if (socketA.val==state[0]){
					await obj.setStateAsync('SOCKET_A', { val: state[0], ack: true });
				}				
			} else if (socketA.val!=state[0]){
				await obj.setStateAsync('SOCKET_A', { val: state[0], ack: true });					
			}		
			
			let socketB=await obj.getStateAsync('SOCKET_B');
			if (socketB.ack==false){
				if (socketB.val==state[1]){
					await obj.setStateAsync('SOCKET_B', { val: state[1], ack: true });
				}				
			} else if (socketB.val!=state[1]){
				await obj.setStateAsync('SOCKET_B', { val: state[1], ack: true });					
			}		

			let socketC=await obj.getStateAsync('SOCKET_C');
			if (socketC.ack==false){
				if (socketC.val==state[2]){
					await obj.setStateAsync('SOCKET_C', { val: state[2], ack: true });
				}				
			} else if (socketC.val!=state[2]){
				await obj.setStateAsync('SOCKET_C', { val: state[2], ack: true });					
			}					
			let socketD=await obj.getStateAsync('SOCKET_D');
			if (socketD.ack==false){
				if (socketD.val==state[3]){
					await obj.setStateAsync('SOCKET_D', { val: state[3], ack: true });
				}				
			} else if (socketD.val!=state[3]){
				await obj.setStateAsync('SOCKET_D', { val: state[3], ack: true });					
			}		


			obj.step=0;
			obj.client.end ();
		} else {
			obj.log.debug('Received: ' + data);
		}	
	}
	
	connectionError(err) {
		obj.log.error('Connection error:' + err);
		this.setState('info.connection', false,true);					
		obj.step=0;
	}


	connectionClose() {
		obj.log.debug('Connection closed');
		obj.step=0;
	}

	parseState (data,task,key){
		var state=[null,null,null,null];
		var on;
		for (var i= 0; i < 4; i++) {
			var stat = ((((data[i] - key[1]) ^ key[0]) - task[3]) ^ task[2]) & 0xff;
			switch (stat) {
				case 0x22:
					on = false; // protocol version 2.0 34
					break;
				case 0x11:
					on = true; // protocol version 2.0 17
					break;
				case 0x41:
					on = true; // protocol version 2.1 65
					break;
				case 0x82:
					on = false; // protocol version 2.1 130
					break;
				case 0x51:
					on = true; // WLAN version 81
					break;
				case 0x92:
					on = false; // WLAN version 146
					break;
			}
			state[3-i] = on;
		}		
		return state;

	}

	setStates (client,task,key,socketA=null,socketB=null,socketC=null,socketD=null){
		var ctrlcrypt = new Uint8Array(4);
		var val;
		if (socketA==null) val=0x04; else if (socketA==true) val=0x1; else val = 0x2;
		ctrlcrypt[3] = (((val ^ task[2]) + task[3]) ^ key[0]) + key[1];
		if (socketB==null) val=0x04; else if (socketB==true) val=0x1; else val = 0x2;
		ctrlcrypt[2] = (((val ^ task[2]) + task[3]) ^ key[0]) + key[1];
		if (socketC==null) val=0x04; else if (socketC==true) val=0x1; else val = 0x2;
		ctrlcrypt[1] = (((val ^ task[2]) + task[3]) ^ key[0]) + key[1];
		if (socketD==null) val=0x04; else if (socketD==true) val=0x1; else val = 0x2;
		ctrlcrypt[0] = (((val ^ task[2]) + task[3]) ^ key[0]) + key[1];
		const buffer = Buffer.from(ctrlcrypt);
		client.write(buffer);		
	}
	
}

if (require.main !== module) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new Energenie(options);
} else {
    // otherwise start the instance directly
    new Energenie();
}