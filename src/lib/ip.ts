export const getPublicIP = async (): Promise<string> => {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip || '0.0.0.0';
    } catch (error) {
        console.warn('[IP_SERVICE] Failed to fetch public IP:', error);
        return '0.0.0.0';
    }
};
