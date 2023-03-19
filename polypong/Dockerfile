# syntax=docker/dockerfile:1

FROM node:alpine

RUN corepack enable

USER node
WORKDIR /polypong

COPY pnpm-lock.yaml ./
RUN pnpm fetch

COPY ./ /polypong

RUN pnpm install --offline

CMD [ "pnpm", "build" ]
