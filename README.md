# Emphemral chat app

An Angular application for secure, ephemeral chats using WebRTC and WebSockets.

## Trying it out

There's a few more changes I'd like to add in before getting this on my website, so stay tuned!

## Running it yourself

### RTC configuration

You will need to supply your own [https://developer.mozilla.org/en-US/docs/Web/API/RTCConfiguration](`RTCConfiguration`), in particular the STUN (and TURN) servers, to be able to run this outside of your local network. [There are some public ones](https://gist.github.com/zziuni/3741933) but they may not be reliable and I recommend setting one up yourself. I use `coturn` and I roughly describe the setup in [my blog post on this topic](https://joshuasmock.com/posts/project-creating-a-secure-peer-to-peer-web-chat-application.html#private-networks).

### Running (and developing) locally

The simplest way is to run both the server and frontend in "development" mode. To do that, you can run the following commands:

```
# Ensure we are on the correct Node.js version. Angular will err if you are not on a newer version of Node.js.
> nvm use

# Alternatively, if you don't use `nvm` you just need to be on `erbium` LTS or newer.
# Now, install the dependencies
> npm ci

# In one terminal, serve the frontend application
> npm run frontend:serve

# In another terminal, start the server
> npm run server:run-local
```

The WebSocket server will start running on `localhost:9000` and you can go to the application by visiting [`http://localhost:4200/`](http://localhost:4200/). You can then create a room and open the generated room URL in multiple tabs or windows to start chatting!

Note that Angular automatically reloads the page when the code changes (sadly no hot reload ☹️) and when this happens, one or more of the chat windows may appear in a weird state (e.g. you may have more participants than the number of tabs/windows you have open).

### Running on a server

Note: some of the changes that I'm working on will make this easier. Here be dragons!

First, ensure that you have the proper RTC configuration (at least a STUN server, if not both STUN and TURN servers), and update the frontend [`environment.prod.ts`](./frontend/src/environments/environment.prod.ts) configuration to use the correct URL for the WebSocket server (you'll need to deploy this somewhere).

Next, build both the frontend and servers using `npm run frontend:build` and `npm run server:build`, and finally put them both somewhere publicly available.

## License

MIT
