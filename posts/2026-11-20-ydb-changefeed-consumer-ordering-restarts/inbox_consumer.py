import json
import sqlite3


def open_inbox(path):
    connection = sqlite3.connect(path)
    connection.execute('PRAGMA synchronous = FULL')
    connection.execute('''CREATE TABLE IF NOT EXISTS inbox (
        stream_id TEXT NOT NULL,
        partition_id INTEGER NOT NULL,
        offset INTEGER NOT NULL,
        event_json TEXT NOT NULL,
        PRIMARY KEY (stream_id, partition_id, offset)
    )''')
    connection.commit()
    return connection


def consume_one(reader, inbox, stream_id):
    message = reader.receive_message(timeout=5)
    if not message.alive:
        raise RuntimeError('Partition ownership changed; stop and recreate the reader')
    event = json.loads(message.data)
    if not isinstance(event, dict) or 'key' not in event:
        raise ValueError('Expected a JSON row-change event')
    payload = json.dumps(event, separators=(',', ':'), ensure_ascii=False)
    with inbox:
        inbox.execute('''INSERT INTO inbox VALUES (?, ?, ?, ?)
                         ON CONFLICT(stream_id, partition_id, offset) DO NOTHING''',
                      (stream_id, message.partition_id, message.offset, payload))
    reader.commit_with_ack(message, timeout=5)
