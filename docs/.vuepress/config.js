module.exports = {
  title: '梳理',
  description: 'foredawn',
  // head: [
  //   ['link', {
  //     rel: 'icon',
  //     href: '/logo.jpg'
  //   }]
  // ],
  markdown: {
    lineNumber: true
  },
  themeConfig: {
    nav: require('./nav.js'),
    sidebar:require('./sidebar.js'),
    sidebarDepth: 2,
    lastUpdated: 'Last Updated'
  }
}