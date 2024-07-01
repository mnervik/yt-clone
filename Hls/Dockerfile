FROM asusguy94/ubuntu-ffmpeg-cuda:ubuntu22.04-cuda11.8 as builder

# Set working DIR
WORKDIR /app
RUN npm install -g pnpm

# Copy All Files
COPY . ./
RUN pnpm install --frozen-lockfile
RUN pnpm run build

RUN addgroup --system users
RUN adduser --system --uid 1000 --ingroup users user
USER user

CMD ["sh", "-c", "umask 0000 && node dist/index.js"]