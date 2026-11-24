SELECT event_id
FROM events VIEW payload_json
WHERE JSON_VALUE(payload, '$.service' RETURNING Utf8) = 'checkout'u
ORDER BY event_id;
