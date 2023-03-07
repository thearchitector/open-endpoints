#!/bin/bash

sleep 3
v run . &
set -e
PORT=${PORT:-8000}
sleep 3


## === TESTS


# the metric doesn't exist
echo "- the metric doesn't exist"
curl -s \
    -H "Accept: application/json" \
    localhost:${PORT}/metrics/generic/hello | \
grep -q "No metric is known with the provided slug." || (echo "=> FAILED" && exit 1)
echo "=> PASSED"

# invalid request (missing slug)
echo "- invalid create request (missing slug)"
curl -s \
    -H "Content-Type: application/json" \
    -d '{"metric": 98}' \
    localhost:${PORT}/metrics/generic | \
grep -q "Invalid metric request." || (echo "=> FAILED" && exit 1)
echo "=> PASSED"

# invalid request (missing metric)
echo "- invalid create request (missing metric)"
curl -s \
    -H "Content-Type: application/json" \
    -d '{"slug": "hello"}' \
    localhost:${PORT}/metrics/generic | \
grep -q "Invalid metric request." || (echo "=> FAILED" && exit 1)
echo "=> PASSED"

# create a metric
echo "- create a metric"
export authkey=$(curl -s \
    -H "Content-Type: application/json" \
    -d '{"slug": "hello", "metric": 98}' \
    localhost:${PORT}/metrics/generic | \
jq '.authkey')
[[ $authkey != "null" ]] || (echo "=> FAILED" && exit 1)
echo "=> PASSED"

# get the new metric
echo "- get a metric"
curl -s \
    -H "Accept: application/json" \
    localhost:${PORT}/metrics/generic/hello | \
grep -q '"message":"98"' || (echo "=> FAILED" && exit 1)
echo "=> PASSED"

# unauthorized request (missing the authkey)
echo "- unauthorized update request (missing the authkey)"
curl -s \
    -H "Content-Type: application/json" \
    -d '{"slug": "hello", "metric": 72}' \
    localhost:${PORT}/metrics/generic | \
grep -q "You don't have permission to update this metric." || (echo "=> FAILED" && exit 1)
echo "=> PASSED"

# update the metric
echo "- update the metric"
curl -s \
    -H "Content-Type: application/json" \
    -d "{\"slug\": \"hello\", \"metric\": 72, \"authkey\": $authkey}" \
    localhost:${PORT}/metrics/generic | \
grep -q "The metric has been updated successfully." || (echo "=> FAILED (1)" && exit 1)
curl -s \
    -H "Accept: application/json" \
    localhost:${PORT}/metrics/generic/hello | \
grep -q '"message":"72"' || (echo "=> FAILED (2)" && exit 1)
echo "=> PASSED"
