#!/usr/bin/env bash
set -euo pipefail
lab_root=${1:?Pass the absolute existing lab directory}
case "$lab_root" in
  /*) ;;
  *) printf '%s\n' 'Use an absolute directory path' >&2; exit 1 ;;
esac
case "$lab_root" in
  *,*) printf '%s\n' 'Use a path without commas' >&2; exit 1 ;;
esac
test -d "$lab_root/data"
test -d "$lab_root/certs"

image='ydbplatform/local-ydb:26.2.1.16@sha256:b5ccc8fa737321094f17963193c2e4213694a3bda261742ea582cadece63bb09'
docker run -d \
  --name ydb-persistence-lab \
  --hostname localhost \
  --platform linux/amd64 \
  --publish 127.0.0.1:2135:2135 \
  --publish 127.0.0.1:8765:8765 \
  --mount "type=bind,src=$lab_root/data,dst=/ydb_data" \
  --mount "type=bind,src=$lab_root/certs,dst=/ydb_certs" \
  --env YDB_USE_IN_MEMORY_PDISKS=false \
  --env YDB_GRPC_ENABLE_TLS=true \
  --env YDB_GRPC_TLS_DATA_PATH=/ydb_certs \
  --env GRPC_TLS_PORT=2135 \
  --env MON_PORT=8765 \
  "$image"
