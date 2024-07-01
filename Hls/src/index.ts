import fs from 'fs/promises'
import fsBase from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import bitrates from './bitrates.json' with { type: 'json' }
import getDimensions from 'get-video-dimensions'

const execAsync = promisify(exec)

async function fileExists(path: string): Promise<boolean> {
  return new Promise<boolean>(resolve => fsBase.access(path, fsBase.constants.F_OK, err => resolve(!err)))
}

async function cli(args: string[]): Promise<void> {
  await execAsync(args.join(' '))
}

async function ffmpeg(inp: string, out: string, str: string, streamMaps: string, use_gpu: boolean) {
  const arr = ['ffmpeg', '-hide_banner']

  if (use_gpu) {
    arr.push('-hwaccel', 'cuda', '-hwaccel_output_format', 'cuda', '-extra_hw_frames', '9', '-threads', '1')
  }

  arr.push('-i', `"${inp}"`)
  arr.push(...str.split(' '))
  arr.push('-var_stream_map', `"${streamMaps}"`)
  arr.push(`"${out}"`)

  await cli(arr)
}

async function processFiles(files: string[]): Promise<void> {
  for await (const filename of files) {
    // Check if the file still exists
    if (await fileExists(filename)) {
      const baseName = path.parse(filename).name
      fs.access(baseName, fs.constants.F_OK).catch(() => {
        fs.mkdir(baseName)
      })

      // start processing files if video/master.m3u8 is missing
      await fs.access(path.join(baseName, 'master.m3u8'), fs.constants.F_OK).catch(async () => {
        console.log(`Processing file: ${filename}`)

        const { height } = await getDimensions(filename)
        await generateHLS(filename, baseName, height, true)
      })
    }
  }
}

async function generateHLS(file: string, folder: string, height: number, use_gpu = false) {
  const base = 'stream%v'

  let streamMap = ''
  let str = `-g 48 -keyint_min 48 -sc_threshold 0 -tune animation -crf 20 -f hls -hls_time 10 -hls_list_size 0 -hls_playlist_type vod -master_pl_name master.m3u8 -hls_segment_filename "${folder}/${base}/%04d.ts"`

  let idx = 0
  Object.entries(bitrates).forEach(([quality, value]) => {
    if (height >= Number(quality)) {
      const bitrate = value['bitrate'] * 1000

      streamMap += `v:${idx},a:${idx} `
      str += ` -map a:0 -c:a:${idx} copy -map v:0 -b:v:${idx} ${bitrate}`

      if (use_gpu) {
        str += ` -c:v:${idx} h264_nvenc -filter:v:${idx} "scale_npp=-2:${quality}"`
      } else {
        str += ` -filter:v:${idx} scale=-2:${quality}`
      }

      idx += 1
    }
  })

  if (idx > 0) {
    try {
      await ffmpeg(file, path.join(folder, `${base}/playlist.m3u8`), str, streamMap.trim(), use_gpu)
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Impossible to convert between the formats supported by the filter')) {
          console.error('Error: Filter-error. Skipping file.')
        } else if (error.message.includes('Error initializing output stream')) {
          console.error('Error: OutputStream-error. Skipping file.')
        } else {
          console.error(`Error: GPU encoding failed. Skipping file.`)
          console.log(error.message)
          console.log()
        }
      } else {
        console.error(`Error: Unhandled exception.`)
      }
    }
  }
}

async function main(): Promise<void> {
  process.chdir(path.join(process.cwd(), 'videos'))

  try {
    const files = await fs.readdir(process.cwd())
    const videoFiles = files.filter(file => file.endsWith('.mp4'))

    await processFiles(videoFiles) // Use GPU if necessary
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`)
    } else {
      console.error(`Error: Unhandled exception.`)
    }
    process.exit(1)
  }
}

main()
