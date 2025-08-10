# 🎮 Phaser 3 Game - Obelisk Lobby

A 2D game built with Phaser 3, Next.js, and TypeScript featuring an interactive obelisk lobby environment.

## 🚀 Live Demo

**🎮 Play Now:** [https://markicob-git-main-amir-safs-projects.vercel.app](https://markicob-git-main-amir-safs-projects.vercel.app)

*Note: Primary domain is being configured. This preview domain is fully functional and auto-updates.*

**Repository:** [https://github.com/yourextrem/markicob](https://github.com/yourextrem/markicob)

## 🛠️ Tech Stack

- **Game Engine:** Phaser 3.90.0
- **Framework:** Next.js 15.4.6
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Deployment:** Vercel (recommended)

## 📁 Project Structure

```
project3/
├── public/
│   └── game/
│       └── assets/
│           ├── maps/
│           │   ├── obelisk_lobby.json
│           │   └── obelisk_lobby.png
│           ├── object_animation/
│           │   ├── arcade_building/
│           │   ├── armory_blacksmith/
│           │   ├── bridge_building/
│           │   ├── obelisk_tower/
│           │   ├── plant_tree/
│           │   ├── stone_sector/
│           │   └── water_fall/
│           └── sprites/
│               ├── characters/
│               └── objects/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   └── Game.tsx
│   └── game/
│       ├── config/
│       │   └── GameConfig.ts
│       ├── scenes/
│       │   ├── MainScene.ts
│       │   ├── MapScene.ts
│       │   ├── MapTestScene.ts
│       │   ├── PlayerTestScene.ts
│       │   └── PreloaderScene.ts
│       └── sprites/
│           └── Player.ts
└── Phaserdesign/
    └── [Documentation files]
```

## 🎯 Features

- **Responsive Design:** Automatically scales to any screen size
- **Tile-based Map:** Interactive obelisk lobby environment
- **Animated Objects:** Various animated buildings and environmental elements
- **Collision Detection:** Proper physics and collision handling
- **Modern Architecture:** Clean separation of concerns with TypeScript

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourextrem/markicob.git
cd markicob
```

2. **Install dependencies**
```bash
npm install
```

3. **Run the development server**
```bash
npm run dev
```

4. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

## 🎮 Game Controls

- **Movement:** Arrow keys or WASD
- **Interaction:** Spacebar (if implemented)
- **Fullscreen:** F11

## 🗺️ Map Information

The game features the **Obelisk Lobby** map with:
- 128x96 tile grid
- Multiple animated object layers
- Collision detection areas
- Various environmental elements

## 🚀 Deployment

### Vercel (Recommended)

1. **Push to GitHub**
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Deploy to Vercel**
- Go to [vercel.com](https://vercel.com)
- Connect your GitHub account
- Import your repository: [https://github.com/yourextrem/markicob](https://github.com/yourextrem/markicob)
- Deploy automatically

### Alternative: Netlify

1. **Build the project**
```bash
npm run build
```

2. **Deploy to Netlify**
- Drag and drop the `.next` folder to Netlify
- Or connect your GitHub repository

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Adding New Scenes

1. Create a new scene file in `src/game/scenes/`
2. Extend the `Phaser.Scene` class
3. Add it to the game config in `src/components/Game.tsx`

### Adding New Assets

1. Place assets in `public/game/assets/`
2. Load them in your scene's `preload()` method
3. Use them in your scene's `create()` method

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

If you have any questions or need help, please open an issue on GitHub.

---

**Made with ❤️ using Phaser 3 and Next.js**
