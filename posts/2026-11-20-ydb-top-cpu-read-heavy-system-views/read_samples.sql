DECLARE $since AS Timestamp;
DECLARE $until AS Timestamp;
SELECT IntervalEnd, Rank, ReadBytes, ReadRows, CPUTime, Partitions, QueryText
FROM `.sys/top_queries_by_read_bytes_one_minute`
WHERE IntervalEnd >= $since AND IntervalEnd < $until
ORDER BY ReadBytes DESC
LIMIT 20;
