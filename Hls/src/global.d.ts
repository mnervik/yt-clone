declare module 'get-video-dimensions' {
  function placeholder(filename: string): Promise<{ height: number; width: number }>

  export = placeholder
}
