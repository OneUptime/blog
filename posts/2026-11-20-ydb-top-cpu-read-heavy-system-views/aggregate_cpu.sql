DECLARE $since AS Timestamp;
DECLARE $until AS Timestamp;
SELECT QueryText,
       SUM(Count) AS ObservedRuns,
       SUM(SumCPUTime) AS ObservedCPUUs,
       SUM(SumReadBytes) AS ObservedReadBytes
FROM `.sys/query_metrics_one_minute`
WHERE IntervalEnd >= $since AND IntervalEnd < $until
GROUP BY QueryText
ORDER BY ObservedCPUUs DESC
LIMIT 20;
