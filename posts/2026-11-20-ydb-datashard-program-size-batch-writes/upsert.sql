DECLARE $rows AS List<Struct<id: Uint64, payload: Utf8>>;
UPSERT INTO import_items (id, payload)
SELECT id, payload FROM AS_TABLE($rows);
