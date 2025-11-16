const sdk = require('node-appwrite');

module.exports = async function (req, res) {
    const client = new sdk.Client();
    const users = new sdk.Users(client);
    const teams = new sdk.Teams(client);
    const database = new sdk.Databases(client);

    if (!req.variables['APPWRITE_FUNCTION_API_KEY']) {
        console.error("Environment variable APPWRITE_FUNCTION_API_KEY is not set.");
        return res.json({ success: false, message: 'Server configuration error.' }, 400);
    }

    client
        .setEndpoint(req.variables['APPWRITE_FUNCTION_ENDPOINT'])
        .setProject(req.variables['APPWRITE_FUNCTION_PROJECT_ID'])
        .setKey(req.variables['APPWRITE_FUNCTION_API_KEY']);

    try {
        const { displayName, email, password, role, restaurantId, teamId } = JSON.parse(req.payload);

        // 1. Create the user in the Auth service
        const newUser = await users.create(sdk.ID.unique(), email, null, password, displayName);

        // 2. Add the user to the team
        await teams.createMembership(teamId, ['member'], newUser.email);

        // 3. Create the user's document in the database
        const userDocPayload = {
            displayName, email, role, restaurantId, teamId,
            requiresPasswordChange: true,
        };

        const MAIN_DATABASE_ID = "69169785000e662b533f";
        const USERS_COLLECTION_ID = "691697a40022acc0a4fe";

        await database.createDocument(
            MAIN_DATABASE_ID, USERS_COLLECTION_ID, newUser.$id, userDocPayload,
            [
                sdk.Permission.read(sdk.Role.user(newUser.$id)),
                sdk.Permission.update(sdk.Role.user(newUser.$id)),
                sdk.Permission.delete(sdk.Role.user(newUser.$id)),
                sdk.Permission.read(sdk.Role.team(teamId)),
                sdk.Permission.update(sdk.Role.team(teamId, 'owner')),
            ]
        );

        res.json({ success: true });

    } catch (error) {
        console.error("Error executing function:", error);
        res.json({ success: false, message: error.message || 'An unknown server error occurred.' }, 400);
    }
};