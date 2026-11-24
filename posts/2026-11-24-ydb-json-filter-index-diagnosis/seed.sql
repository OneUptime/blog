UPSERT INTO events (event_id, payload) VALUES
    (1, JsonDocument(@@{"service":"checkout","duration_ms":140}@@)),
    (2, JsonDocument(@@{"service":"catalog","duration_ms":70}@@)),
    (3, JsonDocument(@@{"service":"checkout","duration_ms":15}@@)),
    (4, JsonDocument(@@{"duration_ms":90}@@));
