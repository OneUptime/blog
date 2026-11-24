#!/usr/bin/env bash
set -euo pipefail

YDB_LAB_IMAGE='ydbplatform/local-ydb@sha256:9e46fd45875551a75bcf34d0bb9ca0baa1d8763a4ccf2070af45f4467c4b7402'

docker run -d \
  --name ydb-kafka-lab \
  --hostname localhost \
  --platform linux/amd64 \
  --publish 127.0.0.1:9092:9092 \
  --publish 127.0.0.1:8765:8765 \
  --env YDB_KAFKA_PROXY_PORT=9092 \
  --env MON_PORT=8765 \
  --env YDB_USE_IN_MEMORY_PDISKS=true \
  "$YDB_LAB_IMAGE"
