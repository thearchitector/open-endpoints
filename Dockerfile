# syntax=docker/dockerfile:1


# == V STAGE
FROM alpine:3.17 as v

ENV PATH /opt/vlang:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

WORKDIR /opt/vlang
RUN apk --no-cache add \
        git \
        build-base \
        bash \
        vim && \
    git clone https://github.com/vlang/v/ /opt/vlang && \
    make


# == APPLICATION STAGE
FROM v

RUN apk --no-cache add \
        libpq \
        postgresql-dev \
        postgresql-client \
        curl \
        jq

WORKDIR /open-endpoints
COPY ./ /open-endpoints

CMD [ "v", "crun", "." ]
