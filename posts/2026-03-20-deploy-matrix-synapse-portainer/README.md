# How to Deploy Matrix/Synapse via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Matrix, Synapse, Federated Messaging, Docker, Self-Hosting, Decentralized

Description: Learn how to deploy a Matrix Synapse homeserver via Portainer with PostgreSQL backend, enabling federated and end-to-end encrypted messaging.

---

Matrix is an open, decentralized communication protocol. Synapse is the reference homeserver implementation. Running your own homeserver gives you full control over your messages and lets you federate with other Matrix servers worldwide.

## Prerequisites

- Portainer running
- A public domain with valid TLS (federation requires HTTPS on port 443 or 8448)
- At least 1GB RAM

## Generate Server Config

Before deploying, generate the initial configuration:

```bash
# Generate a homeserver.yaml and signing key

docker run --rm -v synapse_data:/data \
  -e SYNAPSE_SERVER_NAME=matrix.example.com \
  -e SYNAPSE_REPORT_STATS=no \
  matrixdotorg/synapse:latest generate
```

This writes `homeserver.yaml` and `matrix.example.com.signing.key` to the `synapse_data` volume.

## Compose Stack

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: synapse
      POSTGRES_PASSWORD: synapsepass       # Change this
      POSTGRES_DB: synapse
      POSTGRES_INITDB_ARGS: "--encoding=UTF-8 --lc-collate=C --lc-ctype=C"
    volumes:
      - synapse_db:/var/lib/postgresql/data

  synapse:
    image: matrixdotorg/synapse:latest
    restart: unless-stopped
    depends_on:
      - postgres
    ports:
      - "8448:8448"   # Federation port
      - "8008:8008"   # Client API port
    volumes:
      - synapse_data:/data
    environment:
      SYNAPSE_CONFIG_PATH: /data/homeserver.yaml

volumes:
  synapse_db:
  synapse_data:
```

## Updating homeserver.yaml for PostgreSQL

Edit the `database` section of the generated `homeserver.yaml`:

```yaml
database:
  name: psycopg2
  args:
    user: synapse
    password: synapsepass
    dbname: synapse
    host: postgres
    cp_min: 5
    cp_max: 10
```

## Creating Your First User

```bash
docker exec -it synapse register_new_matrix_user \
  -c /data/homeserver.yaml \
  http://localhost:8008
```

## Monitoring

Use OneUptime to monitor `http://<host>:8008/_matrix/client/versions`. Synapse returns a JSON object listing supported Matrix versions when healthy. Alert on any non-200 response to catch homeserver outages.
