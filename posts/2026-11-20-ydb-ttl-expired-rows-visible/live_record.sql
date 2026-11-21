DECLARE $record_id AS Utf8;
DECLARE $as_of AS Timestamp;
SELECT record_id, payload
FROM ttl_records_lab
WHERE record_id = $record_id
  AND expire_at > $as_of;
