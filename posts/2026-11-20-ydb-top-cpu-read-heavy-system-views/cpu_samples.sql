DECLARE $since AS Timestamp;
DECLARE $until AS Timestamp;
SELECT IntervalEnd, Rank, CPUTime, Duration, ReadRows, ReadBytes, Partitions, QueryText
FROM `.sys/top_queries_by_cpu_time_one_minute`
WHERE IntervalEnd >= $since AND IntervalEnd < $until
ORDER BY CPUTime DESC
LIMIT 20;
