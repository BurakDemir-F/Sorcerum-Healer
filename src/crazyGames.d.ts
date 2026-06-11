// C#'taki interface mantığıyla aynıdır.
// Sadece pencere (window) nesnesine CrazyGames'in var olduğunu söylüyoruz.

interface Window {
    CrazyGames: {
        SDK: {
            ad: {
                requestAd: (type: 'midroll' | 'rewarded', callbacks: AdCallbacks) => void;
            };
            game: {
                gameplayStart: () => void;
                gameplayStop: () => void;
                happyTime: () => void;
            };
        };
    };
}

interface AdCallbacks {
    adStarted: () => void;
    adFinished: () => void;
    adError: (error: string) => void;
}