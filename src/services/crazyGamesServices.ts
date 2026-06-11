export const CrazyGamesService = {
    // Oyun başladığında çağrılır (Kullanıcı play'e bastığında)
    startGameplay(): void {
        if (window.CrazyGames?.SDK?.game) {
            window.CrazyGames.SDK.game.gameplayStart();
        }
    },

    // Menüye dönüldüğünde veya oyun duraklatıldığında çağrılır
    stopGameplay(): void {
        if (window.CrazyGames?.SDK?.game) {
            window.CrazyGames.SDK.game.gameplayStop();
        }
    },

    // Oyuncu skor yaptığında veya harika bir şey olduğunda (Efekt tetikler)
    triggerHappyTime(): void {
        if (window.CrazyGames?.SDK?.game) {
            window.CrazyGames.SDK.game.happyTime();
        }
    },

    // Reklam gösterme fonksiyonu (Callback'leri parametre olarak alır)
    showAd(type: 'midroll' | 'rewarded', onComplete: () => void): void {
        if (!window.CrazyGames?.SDK?.ad) {
            // Eğer SDK yüklenmediyse (Yerel testlerde) doğrudan oyuna devam et
            onComplete();
            return;
        }

        window.CrazyGames.SDK.ad.requestAd(type, {
            adStarted: () => {
                console.log("Reklam başladı, oyun seslerini kısın.");
            },
            adFinished: () => {
                console.log("Reklam bitti.");
                onComplete(); // Oyun akışına geri dön
            },
            adError: (error) => {
                console.error("Reklam yüklenemedi:", error);
                onComplete(); // Hata olsa bile oyuncuyu bekletmemek için devam et
            }
        });
    }
};