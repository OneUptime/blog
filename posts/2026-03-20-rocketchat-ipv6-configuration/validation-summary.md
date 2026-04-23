# Validation Summary: How to Configure Rocket.Chat with IPv6

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rocket.Chat
- IPv6 networking
- Nginx reverse proxying
- Node.js server binding
- MongoDB networking and replica sets
- Rocket.Chat REST API
- ip6tables firewall rules
- Linux socket inspection with `ss`
- `curl`

## Sources Consulted
- Rocket.Chat deployment environment variables: https://docs.rocket.chat/docs/deployment-environment-variables
- Rocket.Chat Docker and Nginx deployment guide: https://docs.rocket.chat/docs/deploy-with-docker-docker-compose
- Rocket.Chat MongoDB URL authentication guide: https://docs.rocket.chat/docs/mongodb-uri-authentication
- Rocket.Chat API login endpoint: https://developer.rocket.chat/apidocs/login-with-username-and-password
- Rocket.Chat API profile endpoint: https://developer.rocket.chat/apidocs/get-profile-information
- Rocket.Chat deprecated endpoints list: https://developer.rocket.chat/docs/deprecated-endpoints
- Node.js `server.listen()` documentation: https://nodejs.org/api/net.html#serverlistenport-host-backlog-callback
- Nginx HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx 1.25.1 release announcement: https://mailman.nginx.org/pipermail/nginx-announce/2023/BYSVLPUZESCZHJMTDD25QD7ZKZYADAR2.html
- Nginx WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- MongoDB IP binding documentation: https://www.mongodb.com/docs/manual/core/security-mongodb-configuration/
- MongoDB `mongod` networking options: https://www.mongodb.com/docs/v6.0/reference/program/mongod/
- MongoDB configuration file options: https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB connection string options: https://www.mongodb.com/docs/manual/reference/connection-string-options/
- Local command help/man pages for `curl -6`, `ss -6`, `ip6tables`, and `ip6tables-save`

## Issues Found
- The post said Node.js listens on `0.0.0.0:3000` by default and that this covers IPv6. Node.js documentation says an omitted host listens on `::` when IPv6 is available, or `0.0.0.0` otherwise. I corrected the explanation and added Rocket.Chat's documented `BIND_IP` variable.
- The Rocket.Chat environment example used an unspecified `/opt/Rocket.Chat/environment` file, omitted `BIND_IP`, used a MongoDB URL without `replicaSet`, and included deprecated `MONGO_OPLOG_URL`. I changed it to generic service/container environment values, added loopback `BIND_IP`, added `?replicaSet=rs01`, and removed `MONGO_OPLOG_URL`.
- The Nginx TLS listener used deprecated `listen ... http2` syntax. I changed it to `listen ... ssl;` plus `http2 on;`, matching current Nginx documentation.
- The MongoDB IPv6 snippet was marked as `bash` while containing YAML, omitted `net.ipv6: true`, and did not show the replica set setting required for Rocket.Chat. I split the YAML and shell commands, added `ipv6: true`, added `replication.replSetName`, and included a one-time `rs.initiate()` command for new single-node deployments.
- The IPv6 MongoDB connection string omitted the replica set query option. I added `?replicaSet=rs01`.
- The `ip6tables-save > /etc/ip6tables/rules.v6` command would run the redirection as the invoking shell user rather than under `sudo`. I replaced it with `sudo ip6tables-save -f /etc/ip6tables/rules.v6` and added creation of the rules directory.
- The API test used `/api/v1/info`, which is not a current documented endpoint and overlaps with the removed/deprecated `info` endpoint history. I replaced it with the documented `/api/v1/login` and authenticated `/api/v1/me` endpoints.
- The Nginx access-log grep only matched `2001:` and `::1`, missing many valid IPv6 client addresses. I replaced it with an `awk` check against the first log field containing a colon.
- The firewall note for direct Rocket.Chat access did not account for loopback binding. I clarified that opening port 3000 only helps when not using the proxy and `BIND_IP` is not loopback.

## Review Notes
The Nginx WebSocket proxy headers, `curl -6`, and `ss -6 -tlnp` usage are technically valid. The guide remains focused on using Nginx as the public IPv6 endpoint while Rocket.Chat listens locally, which is the safer deployment pattern for a self-hosted chat server. Future updates could pin a Rocket.Chat release and its supported MongoDB version, but that is outside this IPv6-focused post.
