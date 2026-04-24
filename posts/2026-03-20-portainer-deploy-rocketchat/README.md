# How to Deploy Rocket.Chat via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Rocket.Chat, Team Chat, Collaboration, Self-Hosted

Description: Deploy Rocket.Chat via Portainer as a full-featured team communication platform with voice/video calls, live chat, and omnichannel messaging support.

## Introduction

Rocket.Chat is a feature-rich, open-source team communication platform with voice and video calling, live chat widget integration, and omnichannel support for customer service. Deploy via Portainer with MongoDB for a complete communication hub.

## Deploy as a Stack

```yaml
version: "3.8"

services:
  rocketchat:
    image: registry.rocket.chat/rocketchat/rocket.chat:8.3.2
    container_name: rocketchat
    command:
      - sh
      - -c
      - |
        for i in $$(seq 1 30); do
          node main.js && exit 0
          echo "Tried $$i times. Waiting 5 secs..."
          sleep 5
        done
        exit 1
    environment:
      MONGO_URL: mongodb://rocketchat-db:27017/rocketchat?replicaSet=rs0
      ROOT_URL: "http://<your-domain-or-server-ip>:3000"
      PORT: 3000
      DEPLOY_PLATFORM: compose
    volumes:
      - rocketchat_data:/app/uploads
    ports:
      - "3000:3000"
    depends_on:
      - rocketchat-db
      - mongo-init-replica
    restart: unless-stopped

  # MongoDB with Replica Set (required for Rocket.Chat)
  rocketchat-db:
    image: mongodb/mongodb-community-server:8.0-ubi8
    container_name: rocketchat-db
    command: mongod --replSet rs0 --bind_ip_all --oplogSize 128
    volumes:
      - rocketchat_db:/data/db
    restart: unless-stopped

  # Initialize MongoDB replica set
  mongo-init-replica:
    image: mongodb/mongodb-community-server:8.0-ubi8
    command:
      - sh
      - -c
      - |
        until mongosh 'mongodb://rocketchat-db:27017/?directConnection=true' --eval 'db.adminCommand("ping")' >/dev/null 2>&1; do
          sleep 2
        done
        mongosh 'mongodb://rocketchat-db:27017/?directConnection=true' --eval 'try { rs.status() } catch (e) { rs.initiate({_id: "rs0", members: [{ _id: 0, host: "rocketchat-db:27017" }]}) }'
    depends_on:
      - rocketchat-db

volumes:
  rocketchat_data:
  rocketchat_db:
```

## Initial Setup

1. Access the URL you configured in `ROOT_URL` (for example, `http://<host>:3000`)
2. Complete the setup wizard:
   - Organization information
   - Admin account
   - Server info (URL)
3. Set up your workspace

## Key Features

### Omnichannel (Customer Service)

1. Navigate to **Workspace > Settings > Omnichannel**
2. Enable omnichannel
3. Add channels such as the Live Chat widget, WhatsApp, SMS, or Telegram apps

### Live Chat Widget

Before embedding the widget, add your website domain to **Workspace > Settings > Omnichannel > Livechat > Livechat Allowed Domains**.

```html
<!-- Add to your website -->
<script type="text/javascript">
(function(w, d, s, u) {
  w.RocketChat = function(c) { w.RocketChat._.push(c) };
  w.RocketChat._ = [];
  w.RocketChat.url = u;
  var h = d.getElementsByTagName(s)[0], j = d.createElement(s);
  j.async = true;
  j.src = u + '/rocketchat-livechat.min.js?_=201903270000';
  h.parentNode.insertBefore(j, h);
})(window, document, 'script', 'http://<your-domain-or-server-ip>:3000/livechat');
</script>
```

### Video Calling with Jitsi

1. Install the **Jitsi** app from **Marketplace > Explore**
2. Configure the Jitsi domain in the app settings, for example `meet.jit.si`
3. Go to **Workspace > Settings > Conference Call** and select **Jitsi** as the default provider

## Conclusion

Rocket.Chat deployed via Portainer provides a comprehensive team communication platform that goes beyond simple chat. Its omnichannel capabilities make it suitable for customer service use cases, while the open API and webhooks enable extensive integration with other tools. MongoDB replica set configuration is required for proper Rocket.Chat operation.
