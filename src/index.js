
class WindowMessager {
    constructor (window, strict = false) {
        this.QRY_EVENT = 'window-messager-ready-qry'
        this.ACK_EVENT = 'window-messager-ready-ack'
        
        this.strict = strict
        this.window = window
        this.waitings = {}
        this.windows = {}
        this.listeners = {}
        
        this.window.addEventListener('message', this.onMessage.bind(this))
        
        this.addListener(this.QRY_EVENT, this.onReadyQry.bind(this))
        this.addListener(this.ACK_EVENT, this.onReadyAck.bind(this))
    }

    addWindow(window, name) {
        if (!window || !name) { return }
        if (window === this.window) { return }
        this.waitings[name] = window

        return new Promise(function (resolve, reject) {
            var retry = 30
            var it = setInterval(function(){
                if (!this.waitings[name]) {
                    resolve()
                    clearInterval(it)
                } else if (retry === 0) {
                    reject(new Error('No Response From Window'))
                } else {
                    retry = retry - 1
                    this.newMessage(this.QRY_EVENT, null, this.waitings[name]).send()
                }
            }.bind(this), 30)
        }.bind(this))
    }

    addListener(event, handler) {
        this.listeners[event] = handler
    }

    newMessage(event, data, to) {
        if (typeof to === 'string') {
            to = this.windows[to]
        }
        return new Message(this.window, event, data, to)
    }

    onMessage (e) {
        var from = e.source
        var fromName = ''
        var to = this.window
        var toName = ''
        var payload = e.data
        var windows = Object.keys(this.windows)
        for (let i = 0; i < windows.length; i++) {
            if (from === this.windows[windows[i]]) {
                fromName = windows[i]
            }
            if (to === this.windows[windows[i]]) {
                toName = windows[i]
            }
        }
        if (typeof payload === 'string') {
            try {
                payload = JSON.parse(payload)
            } catch (e) {}
        }
        if (this.strict && !fromName) {
            return
        }
        var message = new Message(from, payload.event, payload.data, to)
        message.fromName = fromName
        message.toName = toName
        if (this.listeners[message.event]) {
            this.listeners[message.event](message)
        }
    }

    onReadyQry (message) {
        this.newMessage(this.ACK_EVENT, null, message.from).send()
    }

    onReadyAck (message) {
        var window = message.from
        var waitings = Object.keys(this.waitings)
        for (let i = 0; i < waitings.length; i++) {
            var key = waitings[i]
            if (this.waitings[key] === window) {
                delete this.waitings[key]
                this.windows[key] = window
            }
        }
    }
}

class Message {
    constructor (from, event, data, to) {
        this.from = from
        this.event = event
        this.data = data
        this.to = to
    }

    send () {
        if (!this.to) {
            return
        }
        this.to.postMessage(JSON.stringify({
            event: this.event,
            data: this.data
        }), '*')
    }
}

if (typeof module !== 'undefined') {
    module.exports = WindowMessager;
}