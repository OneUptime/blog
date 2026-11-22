import json


def batches(records, max_bytes=2 * 1024 * 1024, max_rows=500):
    if max_bytes <= 0 or max_rows <= 0:
        raise ValueError("Batch limits must be positive")
    batch, used = [], 0
    for record in records:
        row = {"id": record["id"], "payload": record["payload"]}
        encoded = json.dumps(
            row, ensure_ascii=False, separators=(",", ":")
        ).encode("utf-8")
        estimated = len(encoded) + 256
        if estimated > max_bytes:
            raise ValueError("One record exceeds the batch budget")
        if batch and (used + estimated > max_bytes
                      or len(batch) >= max_rows):
            yield batch
            batch, used = [], 0
        batch.append(row)
        used += estimated
    if batch:
        yield batch
