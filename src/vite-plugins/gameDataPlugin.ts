import { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

export function gameDataPlugin(): Plugin {
    return{
        name:'save-game-data-plugin',
        configureServer(server){
            server.middlewares.use((req,res,next)=>{
                if(req.method === 'POST' && req.url === '/api/save-game-data'){
                    try{

                        let body = '';

                        req.on('data', (chunk : string) =>{
                            body += chunk.toString();
                        });

                        req.on('end', () => {
                            const filePath = path.resolve(process.cwd(), 'public/assets/gameData.json');
                            const parsedData = JSON.parse(body);
                            fs.writeFileSync(filePath,JSON.stringify(parsedData,null, 2));

                            res.statusCode = 200;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true, message: 'Oyun verisi başarıyla kaydedildi!' }));
                        });
                    }
                    catch (exception : any){
                        res.statusCode = 500;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ success: false, error: exception.message }));
                    }

                }
                else
                {
                    next();
                }
            });
        }
    }
}