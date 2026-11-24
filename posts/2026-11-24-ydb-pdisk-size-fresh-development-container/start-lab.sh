#!/usr/bin/env bash
set -euo pipefail

lab_root="$PWD/ydb-size-16g-lab"
mkdir "$lab_root"
mkdir "$lab_root/data" "$lab_root/certs"

image='ydbplatform/local-ydb:26.2.1.16@sha256:b5ccc8fa737321094f17963193c2e4213694a3bda261742ea582cadece63bb09'

docker run -d \
  --name ydb-size-16g-lab \
  --hostname localhost \
  --platform linux/amd64 \
  --publish 127.0.0.1:2135:2135 \
  --publish 127.0.0.1:8765:8765 \
  --mount "type=bind,src=$lab_root/data,dst=/ydb_data" \
  --mount "type=bind,src=$lab_root/certs,dst=/ydb_certs" \
  --env YDB_PDISK_SIZE=16GB \
  --env YDB_USE_IN_MEMORY_PDISKS=0 \
  --env GRPC_TLS_PORT=2135 \
  --env MON_PORT=8765 \
  "$image"
