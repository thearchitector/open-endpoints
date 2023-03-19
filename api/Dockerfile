# syntax=docker/dockerfile:1

FROM ghcr.io/thearchitector/vlang:latest

RUN apk --no-cache add \
        libpq-dev \
        postgresql-client \
        curl \
        jq

WORKDIR /openendpoint-tools
COPY ./ /openendpoint-tools

RUN --mount=type=cache,target=$CCACHE_DIR \
    v -output server .

CMD [ "./server" ]
